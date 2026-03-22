"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seeds `Delivery_sites` with Ahmedabad-area demo coordinates.
 * Run after migrations: `npx ts-node --files ./src/scripts/seed-delivery-sites.ts`
 */
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../database/db");
const delivery_sites_1 = require("../database/schema/delivery_sites");
const SITES = [
    { label: 'CG Road Hub', lat: 23.033, lon: 72.562, city: 'Ahmedabad', area: 'CG Road', isRetailDrop: true },
    { label: 'Satellite Depot', lat: 23.015, lon: 72.518, city: 'Ahmedabad', area: 'Satellite', isRetailDrop: true },
    { label: 'Maninagar Stop', lat: 22.997, lon: 72.618, city: 'Ahmedabad', area: 'Maninagar', isRetailDrop: true },
    { label: 'Gandhinagar DC', lat: 23.215, lon: 72.636, city: 'Gandhinagar', area: 'Sector 7', isRetailDrop: true },
    {
        label: 'Central Warehouse (depot)',
        lat: 23.06,
        lon: 72.58,
        city: 'Ahmedabad',
        area: 'Naroda',
        isRetailDrop: false,
    },
];
async function main() {
    for (const s of SITES) {
        const [existing] = await db_1.db
            .select({ id: delivery_sites_1.deliverySitesTable.id })
            .from(delivery_sites_1.deliverySitesTable)
            .where((0, drizzle_orm_1.eq)(delivery_sites_1.deliverySitesTable.label, s.label))
            .limit(1);
        if (existing) {
            // eslint-disable-next-line no-console
            console.log('Skip (exists):', s.label);
            continue;
        }
        await db_1.db.insert(delivery_sites_1.deliverySitesTable).values({
            label: s.label,
            latitude: String(s.lat),
            longitude: String(s.lon),
            city: s.city,
            area: s.area,
            isRetailDrop: s.isRetailDrop,
        });
        // eslint-disable-next-line no-console
        console.log('Inserted:', s.label);
    }
    // eslint-disable-next-line no-console
    console.log('Done. Register a delivery_partner and set DEFAULT_DELIVERY_PARTNER_ID in .env for runs.');
}
void main().catch((e) => {
    console.error(e);
    process.exit(1);
});
