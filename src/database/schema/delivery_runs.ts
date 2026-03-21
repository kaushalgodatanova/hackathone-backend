import { decimal, int, mysqlTable, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

import { batchesTable } from './batches';
import { usersTable } from './users';

export const deliveryRunsTable = mysqlTable(
  'Delivery_runs',
  {
    id: int('id').primaryKey().notNull().autoincrement(),
    batchId: int('batch_id')
      .notNull()
      .references(() => batchesTable.id, { onDelete: 'restrict' }),
    partnerId: int('partner_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    totalKm: decimal('total_km', { precision: 12, scale: 3 }).notNull(),
    utilizationPct: decimal('utilization_pct', { precision: 8, scale: 2 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('planned'),
    aiChoiceId: varchar('ai_choice_id', { length: 8 }),
    aiReason: text('ai_reason'),
    candidatePlansJson: text('candidate_plans_json').notNull(),
    chosenPlanJson: text('chosen_plan_json').notNull(),
  },
  (table) => [uniqueIndex('delivery_runs_batch_uq').on(table.batchId)],
);
