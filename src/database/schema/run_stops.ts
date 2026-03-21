import { decimal, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

import { deliveryRunsTable } from './delivery_runs';
import { deliverySitesTable } from './delivery_sites';
import { usersTable } from './users';

export const runStopsTable = mysqlTable('Run_stops', {
  id: int('id').primaryKey().notNull().autoincrement(),
  runId: int('run_id')
    .notNull()
    .references(() => deliveryRunsTable.id, { onDelete: 'cascade' }),
  sequence: int('sequence').notNull(),
  kind: varchar('kind', { length: 16 }).notNull(),
  siteId: int('site_id')
    .notNull()
    .references(() => deliverySitesTable.id, { onDelete: 'restrict' }),
  /** Distributor for pickup; retailer for drop; null if N/A. */
  distributorId: int('distributor_id').references(() => usersTable.id, { onDelete: 'set null' }),
  retailerId: int('retailer_id').references(() => usersTable.id, { onDelete: 'set null' }),
  loadKg: decimal('load_kg', { precision: 12, scale: 3 }).notNull().default('0'),
});
