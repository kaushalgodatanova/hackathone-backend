import { decimal, int, mysqlTable } from 'drizzle-orm/mysql-core';

import { productsTable } from './products';
import { retailerOrdersTable } from './retailer_orders';

export const retailerOrderItemsTable = mysqlTable('Retailer_order_items', {
  id: int('id').primaryKey().notNull().autoincrement(),
  orderId: int('order_id')
    .notNull()
    .references(() => retailerOrdersTable.id, { onDelete: 'cascade' }),
  productId: int('product_id')
    .notNull()
    .references(() => productsTable.id, { onDelete: 'restrict' }),
  quantity: int('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 14, scale: 2 }).notNull(),
});
