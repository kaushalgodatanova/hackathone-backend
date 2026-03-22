"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retailerOrdersTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const batches_1 = require("./batches");
const delivery_sites_1 = require("./delivery_sites");
const users_1 = require("./users");
exports.retailerOrdersTable = (0, mysql_core_1.mysqlTable)('Retailer_orders', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    retailerId: (0, mysql_core_1.int)('retailer_id')
        .notNull()
        .references(() => users_1.usersTable.id, { onDelete: 'cascade' }),
    distributorId: (0, mysql_core_1.int)('distributor_id')
        .notNull()
        .references(() => users_1.usersTable.id, { onDelete: 'restrict' }),
    batchId: (0, mysql_core_1.int)('batch_id').references(() => batches_1.batchesTable.id, { onDelete: 'restrict' }),
    deliverySiteId: (0, mysql_core_1.int)('delivery_site_id').references(() => delivery_sites_1.deliverySitesTable.id, { onDelete: 'set null' }),
    status: (0, mysql_core_1.varchar)('status', { length: 32 }).notNull().default('placed'),
    totalAmount: (0, mysql_core_1.decimal)('total_amount', { precision: 14, scale: 2 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').notNull().defaultNow(),
});
