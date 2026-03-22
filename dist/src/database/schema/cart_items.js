"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartItemsTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const carts_1 = require("./carts");
const products_1 = require("./products");
exports.cartItemsTable = (0, mysql_core_1.mysqlTable)('Cart_items', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    cartId: (0, mysql_core_1.int)('cart_id')
        .notNull()
        .references(() => carts_1.cartsTable.id, { onDelete: 'cascade' }),
    productId: (0, mysql_core_1.int)('product_id')
        .notNull()
        .references(() => products_1.productsTable.id, { onDelete: 'cascade' }),
    quantity: (0, mysql_core_1.int)('quantity').notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [(0, mysql_core_1.uniqueIndex)('cart_items_cart_product_uq').on(table.cartId, table.productId)]);
