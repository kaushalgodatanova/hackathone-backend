"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverySitesTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
exports.deliverySitesTable = (0, mysql_core_1.mysqlTable)('Delivery_sites', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    label: (0, mysql_core_1.varchar)('label', { length: 255 }).notNull(),
    latitude: (0, mysql_core_1.decimal)('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: (0, mysql_core_1.decimal)('longitude', { precision: 10, scale: 7 }).notNull(),
    city: (0, mysql_core_1.varchar)('city', { length: 128 }),
    area: (0, mysql_core_1.varchar)('area', { length: 128 }),
    /** When false, hide from retailer dropdown (depot-only rows). */
    isRetailDrop: (0, mysql_core_1.boolean)('is_retail_drop').notNull().default(true),
});
