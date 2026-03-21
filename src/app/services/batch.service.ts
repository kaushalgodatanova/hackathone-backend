import { and, eq, inArray, sql } from 'drizzle-orm';
import type { ResultSetHeader } from 'mysql2';

import { getEnv } from '../../config/env';
import { db } from '../../database/db';
import { batchesTable } from '../../database/schema/batches';
import { deliveryRunsTable } from '../../database/schema/delivery_runs';
import { deliverySitesTable } from '../../database/schema/delivery_sites';
import { productsTable } from '../../database/schema/products';
import { retailerOrderItemsTable } from '../../database/schema/retailer_order_items';
import { retailerOrdersTable } from '../../database/schema/retailer_orders';
import { runStopsTable } from '../../database/schema/run_stops';
import { usersTable } from '../../database/schema/users';
import { haversineKm } from '../../utils/geo';
import { logger } from '../../utils/logger';

import { choosePlanWithAi, type PlanSummary } from './planChoiceOpenAi.service';

type Tx = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete' | 'transaction' | 'execute'>;

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

type StopDraft = {
  kind: 'pickup' | 'drop';
  siteId: number;
  lat: number;
  lon: number;
  distributorId?: number;
  retailerId?: number;
  deltaKg: number;
};

type CandidatePlan = {
  id: 'A' | 'B';
  totalKm: number;
  utilizationPct: number;
  stops: StopDraft[];
};

function nearestNeighborOrder(
  startLat: number,
  startLon: number,
  points: { lat: number; lon: number; key: string; meta: Omit<StopDraft, 'lat' | 'lon'> }[],
): typeof points {
  const remaining = [...points];
  const ordered: typeof points = [];
  let curLat = startLat;
  let curLon = startLon;
  while (remaining.length) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(curLat, curLon, remaining[i].lat, remaining[i].lon);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    const [next] = remaining.splice(bestI, 1);
    if (!next) break;
    ordered.push(next);
    curLat = next.lat;
    curLon = next.lon;
  }
  return ordered;
}

function routeKm(stops: StopDraft[]): number {
  if (stops.length === 0) return 0;
  let total = 0;
  let pos = { lat: stops[0].lat, lon: stops[0].lon };
  for (let i = 1; i < stops.length; i++) {
    const next = stops[i];
    total += haversineKm(pos.lat, pos.lon, next.lat, next.lon);
    pos = { lat: next.lat, lon: next.lon };
  }
  return Math.round(total * 1000) / 1000;
}

/** Vehicle load (kg) after each stop; pickups add, drops subtract. */
function cumulativeLoadKg(stops: StopDraft[]): number[] {
  let load = 0;
  return stops.map((s) => {
    load += s.deltaKg;
    return Math.max(0, Math.round(load * 1000) / 1000);
  });
}

export class BatchService {
  static async ensureOpenBatchOnStartup(): Promise<void> {
    const [open] = await db.select().from(batchesTable).where(eq(batchesTable.status, 'open')).limit(1);
    if (open) return;
    const env = getEnv();
    const now = new Date();
    const windowMs = env.BATCH_WINDOW_MINUTES * 60 * 1000;
    await db.insert(batchesTable).values({
      opensAt: now,
      closesAt: new Date(now.getTime() + windowMs),
      status: 'open',
    });
    logger.info({ msg: 'Created initial open batch window' });
  }

  /** Call inside checkout transaction. */
  static async getOrCreateOpenBatchId(tx: Tx): Promise<number> {
    await tx.execute(sql`SELECT GET_LOCK('delivery_batch_open', 10)`);
    try {
      const [existing] = await tx.select().from(batchesTable).where(eq(batchesTable.status, 'open')).limit(1);
      if (existing) return existing.id;
      const env = getEnv();
      const now = new Date();
      const windowMs = env.BATCH_WINDOW_MINUTES * 60 * 1000;
      const [ins] = await tx
        .insert(batchesTable)
        .values({
          opensAt: now,
          closesAt: new Date(now.getTime() + windowMs),
          status: 'open',
        })
        .$returningId();
      return ins.id;
    } finally {
      await tx.execute(sql`SELECT RELEASE_LOCK('delivery_batch_open')`);
    }
  }

  static async getCurrentBatchPublic(): Promise<{
    batchId: number;
    opensAt: string;
    closesAt: string;
    closesAtDisplay: string;
    status: string;
    outcome: string | null;
  } | null> {
    const [b] = await db.select().from(batchesTable).where(eq(batchesTable.status, 'open')).limit(1);
    if (!b) return null;
    const tz = getEnv().APP_TIMEZONE;
    return {
      batchId: b.id,
      opensAt: b.opensAt.toISOString(),
      closesAt: b.closesAt.toISOString(),
      closesAtDisplay: b.closesAt.toLocaleString('en-IN', { timeZone: tz }),
      status: b.status,
      outcome: b.outcome ?? null,
    };
  }

  static async tick(): Promise<void> {
    const env = getEnv();
    const [open] = await db.select().from(batchesTable).where(eq(batchesTable.status, 'open')).limit(1);
    if (!open) {
      await BatchService.ensureOpenBatchOnStartup();
      return;
    }

    const now = Date.now();
    const dueByTimer = now >= open.closesAt.getTime();
    let dueEarly = false;
    if (env.EARLY_CLOSE_ENABLED && !dueByTimer) {
      dueEarly = await BatchService.shouldEarlyClose(open.id);
    }

    if (dueByTimer || dueEarly) {
      await BatchService.closeAndOrchestrate(open.id);
    }
  }

  static async shouldEarlyClose(batchId: number): Promise<boolean> {
    const partnerId = await BatchService.resolveDefaultPartnerId();
    if (!partnerId) return false;

    const [partner] = await db.select().from(usersTable).where(eq(usersTable.id, partnerId)).limit(1);
    const cap = partner?.partnerCapacityKg != null ? num(partner.partnerCapacityKg) : 0;
    if (cap <= 0) return false;

    const [wrow] = await db
      .select({
        w: sql<string>`COALESCE(SUM(${retailerOrderItemsTable.quantity} * ${productsTable.weightKg}), 0)`,
      })
      .from(retailerOrdersTable)
      .innerJoin(retailerOrderItemsTable, eq(retailerOrderItemsTable.orderId, retailerOrdersTable.id))
      .innerJoin(productsTable, eq(retailerOrderItemsTable.productId, productsTable.id))
      .where(eq(retailerOrdersTable.batchId, batchId));

    const totalKg = num(wrow?.w ?? 0);
    return totalKg > 0 && totalKg <= cap;
  }

  static async resolveDefaultPartnerId(): Promise<number | null> {
    const env = getEnv();
    if (env.DEFAULT_DELIVERY_PARTNER_ID) return env.DEFAULT_DELIVERY_PARTNER_ID;
    const [p] = await db.select().from(usersTable).where(eq(usersTable.role, 'delivery_partner')).limit(1);
    return p?.id ?? null;
  }

  static async closeAndOrchestrate(batchId: number): Promise<void> {
    const closedAt = new Date();

    await db.transaction(async (tx) => {
      const upd = (await tx
        .update(batchesTable)
        .set({
          status: 'closed',
          closedAt,
          outcome: 'pending',
        })
        .where(and(eq(batchesTable.id, batchId), eq(batchesTable.status, 'open')))) as unknown as ResultSetHeader;

      if (!upd || upd.affectedRows !== 1) {
        return;
      }

      const [orderCnt] = await tx
        .select({ c: sql<string>`count(${retailerOrdersTable.id})` })
        .from(retailerOrdersTable)
        .where(eq(retailerOrdersTable.batchId, batchId));

      const n = Number(orderCnt?.c ?? 0);
      if (n === 0) {
        await tx.update(batchesTable).set({ outcome: 'no_run' }).where(eq(batchesTable.id, batchId));
        await BatchService.insertNextBatchTx(tx, closedAt);
        return;
      }

      const partnerId = await BatchService.resolveDefaultPartnerId();
      if (!partnerId) {
        logger.warn({ msg: 'No delivery partner; skipping run orchestration', batchId });
        await tx.update(batchesTable).set({ outcome: 'completed' }).where(eq(batchesTable.id, batchId));
        await BatchService.insertNextBatchTx(tx, closedAt);
        return;
      }

      const [partner] = await tx.select().from(usersTable).where(eq(usersTable.id, partnerId)).limit(1);
      const capacityKg =
        partner?.partnerCapacityKg != null && num(partner.partnerCapacityKg) > 0 ? num(partner.partnerCapacityKg) : 500;

      const orders = await tx.select().from(retailerOrdersTable).where(eq(retailerOrdersTable.batchId, batchId));

      const orderIds = orders.map((o) => o.id);
      const items = await tx
        .select({
          orderId: retailerOrderItemsTable.orderId,
          quantity: retailerOrderItemsTable.quantity,
          weightKg: productsTable.weightKg,
          distributorId: productsTable.distributorId,
        })
        .from(retailerOrderItemsTable)
        .innerJoin(productsTable, eq(retailerOrderItemsTable.productId, productsTable.id))
        .where(inArray(retailerOrderItemsTable.orderId, orderIds));

      const weightByOrder = new Map<number, number>();
      for (const o of orders) {
        weightByOrder.set(o.id, 0);
      }
      for (const line of items) {
        const w = line.quantity * num(line.weightKg);
        weightByOrder.set(line.orderId, (weightByOrder.get(line.orderId) ?? 0) + w);
      }

      const totalWeight = [...weightByOrder.values()].reduce((a, b) => a + b, 0);
      const utilizationPct = Math.min(100, Math.round((totalWeight / capacityKg) * 10000) / 100);

      const [fallbackSite] = await tx.select().from(deliverySitesTable).orderBy(deliverySitesTable.id).limit(1);

      const distIds = [...new Set(orders.map((o) => o.distributorId))].sort((a, b) => a - b);
      const pickupStops: StopDraft[] = [];

      for (const did of distIds) {
        const [dist] = await tx.select().from(usersTable).where(eq(usersTable.id, did)).limit(1);
        let siteId = dist?.depotSiteId ?? fallbackSite?.id;
        if (!siteId) continue;
        const [site] = await tx.select().from(deliverySitesTable).where(eq(deliverySitesTable.id, siteId)).limit(1);
        if (!site) continue;
        const lat = num(site.latitude);
        const lon = num(site.longitude);
        const w = orders.filter((o) => o.distributorId === did).reduce((s, o) => s + (weightByOrder.get(o.id) ?? 0), 0);
        pickupStops.push({
          kind: 'pickup',
          siteId: site.id,
          lat,
          lon,
          distributorId: did,
          deltaKg: w,
        });
      }

      const dropPoints: { lat: number; lon: number; key: string; meta: Omit<StopDraft, 'lat' | 'lon'> }[] = [];

      for (const o of orders) {
        let siteId = o.deliverySiteId ?? null;
        if (!siteId) {
          const [ret] = await tx.select().from(usersTable).where(eq(usersTable.id, o.retailerId)).limit(1);
          siteId = ret?.defaultDeliverySiteId ?? fallbackSite?.id;
        }
        if (!siteId) continue;
        const [site] = await tx.select().from(deliverySitesTable).where(eq(deliverySitesTable.id, siteId)).limit(1);
        if (!site) continue;
        const lat = num(site.latitude);
        const lon = num(site.longitude);
        dropPoints.push({
          lat,
          lon,
          key: `drop-${o.id}`,
          meta: {
            kind: 'drop',
            siteId: site.id,
            retailerId: o.retailerId,
            deltaKg: -(weightByOrder.get(o.id) ?? 0),
          },
        });
      }

      if (dropPoints.length === 0) {
        logger.warn({ batchId, msg: 'Batch has orders but no resolvable delivery sites; skipping run' });
        await tx.update(batchesTable).set({ outcome: 'completed' }).where(eq(batchesTable.id, batchId));
        await BatchService.insertNextBatchTx(tx, closedAt);
        return;
      }

      const plans = BatchService.buildTwoPlans(pickupStops, dropPoints, utilizationPct);

      const summaries: PlanSummary[] = plans.map((p) => ({
        id: p.id,
        totalKm: p.totalKm,
        utilizationPct: p.utilizationPct,
      }));

      let chosen: CandidatePlan = plans[0]!;
      let aiChoice: string | null = null;
      let aiReason: string | null = null;

      const ai = await choosePlanWithAi(summaries);
      if (ai && (ai.choiceId === 'A' || ai.choiceId === 'B')) {
        chosen = plans.find((p) => p.id === ai.choiceId) ?? [...plans].sort((a, b) => a.totalKm - b.totalKm)[0]!;
        aiChoice = ai.choiceId;
        aiReason = ai.reason;
      } else {
        chosen = [...plans].sort((a, b) => a.totalKm - b.totalKm)[0]!;
      }

      const [runIns] = await tx
        .insert(deliveryRunsTable)
        .values({
          batchId,
          partnerId,
          totalKm: String(chosen.totalKm),
          utilizationPct: String(chosen.utilizationPct),
          status: 'planned',
          aiChoiceId: aiChoice,
          aiReason: aiReason,
          candidatePlansJson: JSON.stringify(summaries),
          chosenPlanJson: JSON.stringify({
            id: chosen.id,
            totalKm: chosen.totalKm,
            stops: chosen.stops.map((s) => ({
              kind: s.kind,
              siteId: s.siteId,
              distributorId: s.distributorId,
              retailerId: s.retailerId,
            })),
          }),
        })
        .$returningId();

      const runId = runIns.id;
      const loads = cumulativeLoadKg(chosen.stops);

      let seq = 0;
      for (let i = 0; i < chosen.stops.length; i++) {
        const stop = chosen.stops[i]!;
        const loadKg = loads[i] ?? 0;
        await tx.insert(runStopsTable).values({
          runId,
          sequence: seq++,
          kind: stop.kind,
          siteId: stop.siteId,
          distributorId: stop.distributorId ?? null,
          retailerId: stop.retailerId ?? null,
          loadKg: String(loadKg),
        });
      }

      await tx.update(batchesTable).set({ outcome: 'completed' }).where(eq(batchesTable.id, batchId));
      await BatchService.insertNextBatchTx(tx, closedAt);
    });
  }

  static buildTwoPlans(
    pickupStops: StopDraft[],
    dropPoints: { lat: number; lon: number; key: string; meta: Omit<StopDraft, 'lat' | 'lon'> }[],
    utilizationPct: number,
  ): CandidatePlan[] {
    const pickups = [...pickupStops];
    const lastPickup = pickups.length > 0 ? pickups[pickups.length - 1] : null;
    const startLat = lastPickup?.lat ?? 23.0225;
    const startLon = lastPickup?.lon ?? 72.5714;

    const nnDrops = nearestNeighborOrder(startLat, startLon, dropPoints);
    const planAStops: StopDraft[] = [...pickups, ...nnDrops.map((d) => ({ ...d.meta, lat: d.lat, lon: d.lon }))];

    const rev = [...nnDrops].reverse();
    const planBStops: StopDraft[] = [...pickups, ...rev.map((d) => ({ ...d.meta, lat: d.lat, lon: d.lon }))];

    return [
      {
        id: 'A',
        totalKm: routeKm(planAStops),
        utilizationPct,
        stops: planAStops,
      },
      {
        id: 'B',
        totalKm: routeKm(planBStops),
        utilizationPct,
        stops: planBStops,
      },
    ];
  }

  static async insertNextBatchTx(tx: Tx, closedAt: Date): Promise<void> {
    const env = getEnv();
    const gapMs = env.ROLLING_GAP_MINUTES * 60 * 1000;
    const windowMs = env.BATCH_WINDOW_MINUTES * 60 * 1000;
    const opensAt = new Date(closedAt.getTime() + gapMs);
    const closesAt = new Date(opensAt.getTime() + windowMs);
    await tx.insert(batchesTable).values({
      opensAt,
      closesAt,
      status: 'open',
    });
  }
}
