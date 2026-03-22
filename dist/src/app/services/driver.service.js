"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../database/db");
const batches_1 = require("../../database/schema/batches");
const delivery_runs_1 = require("../../database/schema/delivery_runs");
const delivery_sites_1 = require("../../database/schema/delivery_sites");
const run_stops_1 = require("../../database/schema/run_stops");
const users_1 = require("../../database/schema/users");
const AppError_1 = require("../../utils/AppError");
function num(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string')
        return Number(v);
    return 0;
}
class DriverService {
    static async listRuns(partnerId) {
        const rows = await db_1.db
            .select({
            run: delivery_runs_1.deliveryRunsTable,
            batch: batches_1.batchesTable,
        })
            .from(delivery_runs_1.deliveryRunsTable)
            .innerJoin(batches_1.batchesTable, (0, drizzle_orm_1.eq)(delivery_runs_1.deliveryRunsTable.batchId, batches_1.batchesTable.id))
            .where((0, drizzle_orm_1.eq)(delivery_runs_1.deliveryRunsTable.partnerId, partnerId))
            .orderBy((0, drizzle_orm_1.desc)(delivery_runs_1.deliveryRunsTable.id));
        const runs = [];
        for (const { run, batch } of rows) {
            const stops = await db_1.db.select().from(run_stops_1.runStopsTable).where((0, drizzle_orm_1.eq)(run_stops_1.runStopsTable.runId, run.id));
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
    static async getRunDetail(partnerId, runId) {
        const [row] = await db_1.db
            .select()
            .from(delivery_runs_1.deliveryRunsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(delivery_runs_1.deliveryRunsTable.id, runId), (0, drizzle_orm_1.eq)(delivery_runs_1.deliveryRunsTable.partnerId, partnerId)))
            .limit(1);
        if (!row)
            throw AppError_1.AppError.notFound('Run not found');
        let candidatePlans = [];
        let chosenPlan = {};
        try {
            candidatePlans = JSON.parse(row.candidatePlansJson);
        }
        catch {
            candidatePlans = [];
        }
        try {
            chosenPlan = JSON.parse(row.chosenPlanJson);
        }
        catch {
            chosenPlan = {};
        }
        const stopRows = await db_1.db
            .select({
            stop: run_stops_1.runStopsTable,
            site: delivery_sites_1.deliverySitesTable,
        })
            .from(run_stops_1.runStopsTable)
            .innerJoin(delivery_sites_1.deliverySitesTable, (0, drizzle_orm_1.eq)(run_stops_1.runStopsTable.siteId, delivery_sites_1.deliverySitesTable.id))
            .where((0, drizzle_orm_1.eq)(run_stops_1.runStopsTable.runId, runId));
        const userIds = new Set();
        for (const { stop } of stopRows) {
            if (stop.distributorId)
                userIds.add(stop.distributorId);
            if (stop.retailerId)
                userIds.add(stop.retailerId);
        }
        const names = new Map();
        if (userIds.size > 0) {
            const users = await db_1.db
                .select({ id: users_1.usersTable.id, name: users_1.usersTable.name })
                .from(users_1.usersTable)
                .where((0, drizzle_orm_1.inArray)(users_1.usersTable.id, [...userIds]));
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
exports.DriverService = DriverService;
