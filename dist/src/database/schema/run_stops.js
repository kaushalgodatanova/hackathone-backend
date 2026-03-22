"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStopsTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const delivery_runs_1 = require("./delivery_runs");
const delivery_sites_1 = require("./delivery_sites");
const users_1 = require("./users");
exports.runStopsTable = (0, mysql_core_1.mysqlTable)('Run_stops', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    runId: (0, mysql_core_1.int)('run_id')
        .notNull()
        .references(() => delivery_runs_1.deliveryRunsTable.id, { onDelete: 'cascade' }),
    sequence: (0, mysql_core_1.int)('sequence').notNull(),
    kind: (0, mysql_core_1.varchar)('kind', { length: 16 }).notNull(),
    siteId: (0, mysql_core_1.int)('site_id')
        .notNull()
        .references(() => delivery_sites_1.deliverySitesTable.id, { onDelete: 'restrict' }),
    /** Distributor for pickup; retailer for drop; null if N/A. */
    distributorId: (0, mysql_core_1.int)('distributor_id').references(() => users_1.usersTable.id, { onDelete: 'set null' }),
    retailerId: (0, mysql_core_1.int)('retailer_id').references(() => users_1.usersTable.id, { onDelete: 'set null' }),
    loadKg: (0, mysql_core_1.decimal)('load_kg', { precision: 12, scale: 3 }).notNull().default('0'),
});
