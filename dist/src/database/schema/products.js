"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const users_1 = require("./users");
exports.productsTable = (0, mysql_core_1.mysqlTable)('Products', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    distributorId: (0, mysql_core_1.int)('distributor_id')
        .notNull()
        .references(() => users_1.usersTable.id, { onDelete: 'cascade' }),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    sku: (0, mysql_core_1.varchar)('sku', { length: 128 }).notNull(),
    weightKg: (0, mysql_core_1.decimal)('weight_kg', { precision: 10, scale: 3 }).notNull(),
    quantityOnHand: (0, mysql_core_1.int)('quantity_on_hand').notNull().default(0),
    unitPrice: (0, mysql_core_1.decimal)('unit_price', { precision: 12, scale: 2 }).notNull(),
    /** Optional grouping for retailer catalog UI. */
    category: (0, mysql_core_1.varchar)('category', { length: 128 }),
    isActive: (0, mysql_core_1.boolean)('is_active').notNull().default(true),
}, (table) => [(0, mysql_core_1.uniqueIndex)('products_distributor_sku_uq').on(table.distributorId, table.sku)]);
