import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

import { productsTable } from './products';
import { usersTable } from './users';

export const stockMovementsTable = mysqlTable('stock_movements', {
  id: int('id').primaryKey().notNull().autoincrement(),
  productId: int('product_id')
    .notNull()
    .references(() => productsTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  changeKind: varchar('change_kind', { length: 16 }).notNull(),
  delta: int('delta').notNull(),
  quantityAfter: int('quantity_after').notNull(),
  actorUserId: int('actor_user_id').references(() => usersTable.id, { onDelete: 'set null' }),
  note: varchar('note', { length: 512 }),
});
