import { boolean, decimal, int, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

import { usersTable } from './users';

export const productsTable = mysqlTable(
  'products',
  {
    id: int('id').primaryKey().notNull().autoincrement(),
    distributorId: int('distributor_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 128 }).notNull(),
    weightKg: decimal('weight_kg', { precision: 10, scale: 3 }).notNull(),
    quantityOnHand: int('quantity_on_hand').notNull().default(0),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    /** Optional grouping for retailer catalog UI. */
    category: varchar('category', { length: 128 }),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('products_distributor_sku_uq').on(table.distributorId, table.sku)],
);
