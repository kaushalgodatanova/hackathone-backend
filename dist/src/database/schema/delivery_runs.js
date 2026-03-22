"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRunsTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const batches_1 = require("./batches");
const users_1 = require("./users");
exports.deliveryRunsTable = (0, mysql_core_1.mysqlTable)('Delivery_runs', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    batchId: (0, mysql_core_1.int)('batch_id')
        .notNull()
        .references(() => batches_1.batchesTable.id, { onDelete: 'restrict' }),
    partnerId: (0, mysql_core_1.int)('partner_id')
        .notNull()
        .references(() => users_1.usersTable.id, { onDelete: 'restrict' }),
    totalKm: (0, mysql_core_1.decimal)('total_km', { precision: 12, scale: 3 }).notNull(),
    utilizationPct: (0, mysql_core_1.decimal)('utilization_pct', { precision: 8, scale: 2 }).notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 32 }).notNull().default('planned'),
    aiChoiceId: (0, mysql_core_1.varchar)('ai_choice_id', { length: 8 }),
    aiReason: (0, mysql_core_1.text)('ai_reason'),
    candidatePlansJson: (0, mysql_core_1.text)('candidate_plans_json').notNull(),
    chosenPlanJson: (0, mysql_core_1.text)('chosen_plan_json').notNull(),
}, (table) => [(0, mysql_core_1.uniqueIndex)('delivery_runs_batch_uq').on(table.batchId)]);
