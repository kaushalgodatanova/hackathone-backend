"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const env_1 = require("../../config/env");
const db_1 = require("../../database/db");
const batches_1 = require("../../database/schema/batches");
const delivery_runs_1 = require("../../database/schema/delivery_runs");
const delivery_sites_1 = require("../../database/schema/delivery_sites");
const products_1 = require("../../database/schema/products");
const retailer_order_items_1 = require("../../database/schema/retailer_order_items");
const retailer_orders_1 = require("../../database/schema/retailer_orders");
const run_stops_1 = require("../../database/schema/run_stops");
const users_1 = require("../../database/schema/users");
const geo_1 = require("../../utils/geo");
const logger_1 = require("../../utils/logger");
const planChoiceOpenAi_service_1 = require("./planChoiceOpenAi.service");
function num(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string')
        return Number(v);
    return 0;
}
function nearestNeighborOrder(startLat, startLon, points) {
    const remaining = [...points];
    const ordered = [];
    let curLat = startLat;
    let curLon = startLon;
    while (remaining.length) {
        let bestI = 0;
        let bestD = Infinity;
        for (let i = 0; i < remaining.length; i++) {
            const d = (0, geo_1.haversineKm)(curLat, curLon, remaining[i].lat, remaining[i].lon);
            if (d < bestD) {
                bestD = d;
                bestI = i;
            }
        }
        const [next] = remaining.splice(bestI, 1);
        if (!next)
            break;
        ordered.push(next);
        curLat = next.lat;
        curLon = next.lon;
    }
    return ordered;
}
function routeKm(stops) {
    if (stops.length === 0)
        return 0;
    let total = 0;
    let pos = { lat: stops[0].lat, lon: stops[0].lon };
    for (let i = 1; i < stops.length; i++) {
        const next = stops[i];
        total += (0, geo_1.haversineKm)(pos.lat, pos.lon, next.lat, next.lon);
        pos = { lat: next.lat, lon: next.lon };
    }
    return Math.round(total * 1000) / 1000;
}
/** Vehicle load (kg) after each stop; pickups add, drops subtract. */
function cumulativeLoadKg(stops) {
    let load = 0;
    return stops.map((s) => {
        load += s.deltaKg;
        return Math.max(0, Math.round(load * 1000) / 1000);
    });
}
class BatchService {
    static async ensureOpenBatchOnStartup() {
        const [open] = await db_1.db.select().from(batches_1.batchesTable).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.status, 'open')).limit(1);
        if (open)
            return;
        const env = (0, env_1.getEnv)();
        const now = new Date();
        const windowMs = env.BATCH_WINDOW_MINUTES * 60 * 1000;
        await db_1.db.insert(batches_1.batchesTable).values({
            opensAt: now,
            closesAt: new Date(now.getTime() + windowMs),
            status: 'open',
        });
        logger_1.logger.info({ msg: 'Created initial open batch window' });
    }
    /** Call inside checkout transaction. */
    static async getOrCreateOpenBatchId(tx) {
        await tx.execute((0, drizzle_orm_1.sql) `SELECT GET_LOCK('delivery_batch_open', 10)`);
        try {
            const [existing] = await tx.select().from(batches_1.batchesTable).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.status, 'open')).limit(1);
            if (existing)
                return existing.id;
            const env = (0, env_1.getEnv)();
            const now = new Date();
            const windowMs = env.BATCH_WINDOW_MINUTES * 60 * 1000;
            const [ins] = await tx
                .insert(batches_1.batchesTable)
                .values({
                opensAt: now,
                closesAt: new Date(now.getTime() + windowMs),
                status: 'open',
            })
                .$returningId();
            return ins.id;
        }
        finally {
            await tx.execute((0, drizzle_orm_1.sql) `SELECT RELEASE_LOCK('delivery_batch_open')`);
        }
    }
    static async getCurrentBatchPublic() {
        const [b] = await db_1.db.select().from(batches_1.batchesTable).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.status, 'open')).limit(1);
        if (!b)
            return null;
        const tz = (0, env_1.getEnv)().APP_TIMEZONE;
        return {
            batchId: b.id,
            opensAt: b.opensAt.toISOString(),
            closesAt: b.closesAt.toISOString(),
            closesAtDisplay: b.closesAt.toLocaleString('en-IN', { timeZone: tz }),
            status: b.status,
            outcome: b.outcome ?? null,
        };
    }
    static async tick() {
        const env = (0, env_1.getEnv)();
        const [open] = await db_1.db.select().from(batches_1.batchesTable).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.status, 'open')).limit(1);
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
    static async shouldEarlyClose(batchId) {
        const partnerId = await BatchService.resolveDefaultPartnerId();
        if (!partnerId)
            return false;
        const [partner] = await db_1.db.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, partnerId)).limit(1);
        const cap = partner?.partnerCapacityKg != null ? num(partner.partnerCapacityKg) : 0;
        if (cap <= 0)
            return false;
        const [wrow] = await db_1.db
            .select({
            w: (0, drizzle_orm_1.sql) `COALESCE(SUM(${retailer_order_items_1.retailerOrderItemsTable.quantity} * ${products_1.productsTable.weightKg}), 0)`,
        })
            .from(retailer_orders_1.retailerOrdersTable)
            .innerJoin(retailer_order_items_1.retailerOrderItemsTable, (0, drizzle_orm_1.eq)(retailer_order_items_1.retailerOrderItemsTable.orderId, retailer_orders_1.retailerOrdersTable.id))
            .innerJoin(products_1.productsTable, (0, drizzle_orm_1.eq)(retailer_order_items_1.retailerOrderItemsTable.productId, products_1.productsTable.id))
            .where((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.batchId, batchId));
        const totalKg = num(wrow?.w ?? 0);
        return totalKg > 0 && totalKg <= cap;
    }
    static async resolveDefaultPartnerId() {
        const env = (0, env_1.getEnv)();
        if (env.DEFAULT_DELIVERY_PARTNER_ID)
            return env.DEFAULT_DELIVERY_PARTNER_ID;
        const [p] = await db_1.db.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.role, 'delivery_partner')).limit(1);
        return p?.id ?? null;
    }
    static async closeAndOrchestrate(batchId) {
        const closedAt = new Date();
        await db_1.db.transaction(async (tx) => {
            const upd = (await tx
                .update(batches_1.batchesTable)
                .set({
                status: 'closed',
                closedAt,
                outcome: 'pending',
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(batches_1.batchesTable.id, batchId), (0, drizzle_orm_1.eq)(batches_1.batchesTable.status, 'open'))));
            if (!upd || upd.affectedRows !== 1) {
                return;
            }
            const [orderCnt] = await tx
                .select({ c: (0, drizzle_orm_1.sql) `count(${retailer_orders_1.retailerOrdersTable.id})` })
                .from(retailer_orders_1.retailerOrdersTable)
                .where((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.batchId, batchId));
            const n = Number(orderCnt?.c ?? 0);
            if (n === 0) {
                await tx.update(batches_1.batchesTable).set({ outcome: 'no_run' }).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.id, batchId));
                await BatchService.insertNextBatchTx(tx, closedAt);
                return;
            }
            const partnerId = await BatchService.resolveDefaultPartnerId();
            if (!partnerId) {
                logger_1.logger.warn({ msg: 'No delivery partner; skipping run orchestration', batchId });
                await tx.update(batches_1.batchesTable).set({ outcome: 'completed' }).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.id, batchId));
                await BatchService.insertNextBatchTx(tx, closedAt);
                return;
            }
            const [partner] = await tx.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, partnerId)).limit(1);
            const capacityKg = partner?.partnerCapacityKg != null && num(partner.partnerCapacityKg) > 0 ? num(partner.partnerCapacityKg) : 500;
            const orders = await tx.select().from(retailer_orders_1.retailerOrdersTable).where((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.batchId, batchId));
            const orderIds = orders.map((o) => o.id);
            const items = await tx
                .select({
                orderId: retailer_order_items_1.retailerOrderItemsTable.orderId,
                quantity: retailer_order_items_1.retailerOrderItemsTable.quantity,
                weightKg: products_1.productsTable.weightKg,
                distributorId: products_1.productsTable.distributorId,
            })
                .from(retailer_order_items_1.retailerOrderItemsTable)
                .innerJoin(products_1.productsTable, (0, drizzle_orm_1.eq)(retailer_order_items_1.retailerOrderItemsTable.productId, products_1.productsTable.id))
                .where((0, drizzle_orm_1.inArray)(retailer_order_items_1.retailerOrderItemsTable.orderId, orderIds));
            const weightByOrder = new Map();
            for (const o of orders) {
                weightByOrder.set(o.id, 0);
            }
            for (const line of items) {
                const w = line.quantity * num(line.weightKg);
                weightByOrder.set(line.orderId, (weightByOrder.get(line.orderId) ?? 0) + w);
            }
            const totalWeight = [...weightByOrder.values()].reduce((a, b) => a + b, 0);
            const utilizationPct = Math.min(100, Math.round((totalWeight / capacityKg) * 10000) / 100);
            const [fallbackSite] = await tx.select().from(delivery_sites_1.deliverySitesTable).orderBy(delivery_sites_1.deliverySitesTable.id).limit(1);
            const distIds = [...new Set(orders.map((o) => o.distributorId))].sort((a, b) => a - b);
            const pickupStops = [];
            for (const did of distIds) {
                const [dist] = await tx.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, did)).limit(1);
                let siteId = dist?.depotSiteId ?? fallbackSite?.id;
                if (!siteId)
                    continue;
                const [site] = await tx.select().from(delivery_sites_1.deliverySitesTable).where((0, drizzle_orm_1.eq)(delivery_sites_1.deliverySitesTable.id, siteId)).limit(1);
                if (!site)
                    continue;
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
            const dropPoints = [];
            for (const o of orders) {
                let siteId = o.deliverySiteId ?? null;
                if (!siteId) {
                    const [ret] = await tx.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, o.retailerId)).limit(1);
                    siteId = ret?.defaultDeliverySiteId ?? fallbackSite?.id;
                }
                if (!siteId)
                    continue;
                const [site] = await tx.select().from(delivery_sites_1.deliverySitesTable).where((0, drizzle_orm_1.eq)(delivery_sites_1.deliverySitesTable.id, siteId)).limit(1);
                if (!site)
                    continue;
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
                logger_1.logger.warn({ batchId, msg: 'Batch has orders but no resolvable delivery sites; skipping run' });
                await tx.update(batches_1.batchesTable).set({ outcome: 'completed' }).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.id, batchId));
                await BatchService.insertNextBatchTx(tx, closedAt);
                return;
            }
            const plans = BatchService.buildTwoPlans(pickupStops, dropPoints, utilizationPct);
            const summaries = plans.map((p) => ({
                id: p.id,
                totalKm: p.totalKm,
                utilizationPct: p.utilizationPct,
            }));
            let chosen = plans[0];
            let aiChoice = null;
            let aiReason = null;
            const ai = await (0, planChoiceOpenAi_service_1.choosePlanWithAi)(summaries);
            if (ai && (ai.choiceId === 'A' || ai.choiceId === 'B')) {
                chosen = plans.find((p) => p.id === ai.choiceId) ?? [...plans].sort((a, b) => a.totalKm - b.totalKm)[0];
                aiChoice = ai.choiceId;
                aiReason = ai.reason;
            }
            else {
                chosen = [...plans].sort((a, b) => a.totalKm - b.totalKm)[0];
            }
            const [runIns] = await tx
                .insert(delivery_runs_1.deliveryRunsTable)
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
                const stop = chosen.stops[i];
                const loadKg = loads[i] ?? 0;
                await tx.insert(run_stops_1.runStopsTable).values({
                    runId,
                    sequence: seq++,
                    kind: stop.kind,
                    siteId: stop.siteId,
                    distributorId: stop.distributorId ?? null,
                    retailerId: stop.retailerId ?? null,
                    loadKg: String(loadKg),
                });
            }
            await tx.update(batches_1.batchesTable).set({ outcome: 'completed' }).where((0, drizzle_orm_1.eq)(batches_1.batchesTable.id, batchId));
            await BatchService.insertNextBatchTx(tx, closedAt);
        });
    }
    static buildTwoPlans(pickupStops, dropPoints, utilizationPct) {
        const pickups = [...pickupStops];
        const lastPickup = pickups.length > 0 ? pickups[pickups.length - 1] : null;
        const startLat = lastPickup?.lat ?? 23.0225;
        const startLon = lastPickup?.lon ?? 72.5714;
        const nnDrops = nearestNeighborOrder(startLat, startLon, dropPoints);
        const planAStops = [...pickups, ...nnDrops.map((d) => ({ ...d.meta, lat: d.lat, lon: d.lon }))];
        const rev = [...nnDrops].reverse();
        const planBStops = [...pickups, ...rev.map((d) => ({ ...d.meta, lat: d.lat, lon: d.lon }))];
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
    static async insertNextBatchTx(tx, closedAt) {
        const env = (0, env_1.getEnv)();
        const gapMs = env.ROLLING_GAP_MINUTES * 60 * 1000;
        const windowMs = env.BATCH_WINDOW_MINUTES * 60 * 1000;
        const opensAt = new Date(closedAt.getTime() + gapMs);
        const closesAt = new Date(opensAt.getTime() + windowMs);
        await tx.insert(batches_1.batchesTable).values({
            opensAt,
            closesAt,
            status: 'open',
        });
    }
}
exports.BatchService = BatchService;
