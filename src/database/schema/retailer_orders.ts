import { decimal, int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

import { batchesTable } from './batches';
import { deliverySitesTable } from './delivery_sites';
import { usersTable } from './users';

export const retailerOrdersTable = mysqlTable('Retailer_orders', {
  id: int('id').primaryKey().notNull().autoincrement(),
  retailerId: int('retailer_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  distributorId: int('distributor_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'restrict' }),
  batchId: int('batch_id').references(() => batchesTable.id, { onDelete: 'restrict' }),
  deliverySiteId: int('delivery_site_id').references(() => deliverySitesTable.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 32 }).notNull().default('placed'),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
