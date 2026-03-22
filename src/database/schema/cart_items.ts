import { int, mysqlTable, timestamp, uniqueIndex } from 'drizzle-orm/mysql-core';

import { cartsTable } from './carts';
import { productsTable } from './products';

export const cartItemsTable = mysqlTable(
  'cart_items',
  {
    id: int('id').primaryKey().notNull().autoincrement(),
    cartId: int('cart_id')
      .notNull()
      .references(() => cartsTable.id, { onDelete: 'cascade' }),
    productId: int('product_id')
      .notNull()
      .references(() => productsTable.id, { onDelete: 'cascade' }),
    quantity: int('quantity').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex('cart_items_cart_product_uq').on(table.cartId, table.productId)],
);
