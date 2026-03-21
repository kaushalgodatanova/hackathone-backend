import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '../../database/db';
import { batchesTable } from '../../database/schema/batches';
import { deliveryRunsTable } from '../../database/schema/delivery_runs';
import { deliverySitesTable } from '../../database/schema/delivery_sites';
import { runStopsTable } from '../../database/schema/run_stops';
import { usersTable } from '../../database/schema/users';
import { AppError } from '../../utils/AppError';

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

export class DriverService {
  static async listRuns(partnerId: number): Promise<{
    runs: {
      id: number;
      batchId: number;
      status: string;
      totalKm: number;
      utilizationPct: number;
      stopsCount: number;
      batchClosesAt: string | null;
    }[];
  }> {
    const rows = await db
      .select({
        run: deliveryRunsTable,
        batch: batchesTable,
      })
      .from(deliveryRunsTable)
      .innerJoin(batchesTable, eq(deliveryRunsTable.batchId, batchesTable.id))
      .where(eq(deliveryRunsTable.partnerId, partnerId))
      .orderBy(desc(deliveryRunsTable.id));

    const runs: {
      id: number;
      batchId: number;
      status: string;
      totalKm: number;
      utilizationPct: number;
      stopsCount: number;
      batchClosesAt: string | null;
    }[] = [];

    for (const { run, batch } of rows) {
      const stops = await db.select().from(runStopsTable).where(eq(runStopsTable.runId, run.id));

      runs.push({
        id: run.id,
        batchId: run.batchId,
        status: run.status,
        totalKm: num(run.totalKm),
        utilizationPct: num(run.utilizationPct),
        stopsCount: stops.length,
        batchClosesAt: batch.closesAt?.toISOString() ?? null,
      });
    }

    return { runs };
  }

  static async getRunDetail(
    partnerId: number,
    runId: number,
  ): Promise<{
    run: {
      id: number;
      batchId: number;
      status: string;
      totalKm: number;
      utilizationPct: number;
      aiChoiceId: string | null;
      aiReason: string | null;
      candidatePlans: unknown;
      chosenPlan: unknown;
    };
    stops: {
      sequence: number;
      kind: string;
      siteLabel: string;
      latitude: number;
      longitude: number;
      loadKg: number;
      distributorName: string | null;
      retailerName: string | null;
    }[];
  }> {
    const [row] = await db
      .select()
      .from(deliveryRunsTable)
      .where(and(eq(deliveryRunsTable.id, runId), eq(deliveryRunsTable.partnerId, partnerId)))
      .limit(1);

    if (!row) throw AppError.notFound('Run not found');

    let candidatePlans: unknown = [];
    let chosenPlan: unknown = {};
    try {
      candidatePlans = JSON.parse(row.candidatePlansJson) as unknown;
    } catch {
      candidatePlans = [];
    }
    try {
      chosenPlan = JSON.parse(row.chosenPlanJson) as unknown;
    } catch {
      chosenPlan = {};
    }

    const stopRows = await db
      .select({
        stop: runStopsTable,
        site: deliverySitesTable,
      })
      .from(runStopsTable)
      .innerJoin(deliverySitesTable, eq(runStopsTable.siteId, deliverySitesTable.id))
      .where(eq(runStopsTable.runId, runId));

    const userIds = new Set<number>();
    for (const { stop } of stopRows) {
      if (stop.distributorId) userIds.add(stop.distributorId);
      if (stop.retailerId) userIds.add(stop.retailerId);
    }

    const names = new Map<number, string>();
    if (userIds.size > 0) {
      const users = await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(inArray(usersTable.id, [...userIds]));
      for (const u of users) {
        names.set(u.id, u.name);
      }
    }

    const stops = stopRows
      .map(({ stop, site }) => ({
        sequence: stop.sequence,
        kind: stop.kind,
        siteLabel: site.label,
        latitude: num(site.latitude),
        longitude: num(site.longitude),
        loadKg: num(stop.loadKg),
        distributorName: stop.distributorId ? (names.get(stop.distributorId) ?? null) : null,
        retailerName: stop.retailerId ? (names.get(stop.retailerId) ?? null) : null,
      }))
      .sort((a, b) => a.sequence - b.sequence);

    return {
      run: {
        id: row.id,
        batchId: row.batchId,
        status: row.status,
        totalKm: num(row.totalKm),
        utilizationPct: num(row.utilizationPct),
        aiChoiceId: row.aiChoiceId ?? null,
        aiReason: row.aiReason ?? null,
        candidatePlans,
        chosenPlan,
      },
      stops,
    };
  }
}
