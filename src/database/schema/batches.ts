import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const batchesTable = mysqlTable('Batches', {
  id: int('id').primaryKey().notNull().autoincrement(),
  opensAt: timestamp('opens_at').notNull(),
  closesAt: timestamp('closes_at').notNull(),
  status: varchar('status', { length: 16 }).notNull().default('open'),
  /** Set when status becomes closed. */
  outcome: varchar('outcome', { length: 16 }),
  closedAt: timestamp('closed_at'),
});
