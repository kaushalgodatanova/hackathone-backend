"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const delivery_sites_1 = require("./delivery_sites");
exports.usersTable = (0, mysql_core_1.mysqlTable)('Users', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    email: (0, mysql_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, mysql_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    role: (0, mysql_core_1.varchar)('role', { length: 32 }).notNull(),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    defaultDeliverySiteId: (0, mysql_core_1.int)('default_delivery_site_id').references(() => delivery_sites_1.deliverySitesTable.id, {
        onDelete: 'set null',
    }),
    depotSiteId: (0, mysql_core_1.int)('depot_site_id').references(() => delivery_sites_1.deliverySitesTable.id, { onDelete: 'set null' }),
    partnerCapacityKg: (0, mysql_core_1.decimal)('partner_capacity_kg', { precision: 10, scale: 3 }),
    vehicleLabel: (0, mysql_core_1.varchar)('vehicle_label', { length: 128 }),
});
