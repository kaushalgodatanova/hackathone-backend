"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../database/db");
const delivery_sites_1 = require("../../database/schema/delivery_sites");
class DeliveryService {
    static async listSites(options) {
        const rows = options.retailDropsOnly
            ? await db_1.db.select().from(delivery_sites_1.deliverySitesTable).where((0, drizzle_orm_1.eq)(delivery_sites_1.deliverySitesTable.isRetailDrop, true))
            : await db_1.db.select().from(delivery_sites_1.deliverySitesTable);
        return rows.map((r) => ({
            id: r.id,
            label: r.label,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            city: r.city ?? null,
            area: r.area ?? null,
            isRetailDrop: r.isRetailDrop,
        }));
    }
}
exports.DeliveryService = DeliveryService;
