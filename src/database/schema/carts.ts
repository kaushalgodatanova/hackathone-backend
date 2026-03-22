import { int, mysqlTable, timestamp, uniqueIndex } from 'drizzle-orm/mysql-core';

import { usersTable } from './users';

export const cartsTable = mysqlTable(
  'carts',
  {
    id: int('id').primaryKey().notNull().autoincrement(),
    retailerId: int('retailer_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex('carts_retailer_uq').on(table.retailerId)],
);
