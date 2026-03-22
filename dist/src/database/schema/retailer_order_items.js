"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retailerOrderItemsTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const products_1 = require("./products");
const retailer_orders_1 = require("./retailer_orders");
exports.retailerOrderItemsTable = (0, mysql_core_1.mysqlTable)('Retailer_order_items', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    orderId: (0, mysql_core_1.int)('order_id')
        .notNull()
        .references(() => retailer_orders_1.retailerOrdersTable.id, { onDelete: 'cascade' }),
    productId: (0, mysql_core_1.int)('product_id')
        .notNull()
        .references(() => products_1.productsTable.id, { onDelete: 'restrict' }),
    quantity: (0, mysql_core_1.int)('quantity').notNull(),
    unitPrice: (0, mysql_core_1.decimal)('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineTotal: (0, mysql_core_1.decimal)('line_total', { precision: 14, scale: 2 }).notNull(),
});
