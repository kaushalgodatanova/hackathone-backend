"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchesTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
exports.batchesTable = (0, mysql_core_1.mysqlTable)('Batches', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    opensAt: (0, mysql_core_1.timestamp)('opens_at').notNull(),
    closesAt: (0, mysql_core_1.timestamp)('closes_at').notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 16 }).notNull().default('open'),
    /** Set when status becomes closed. */
    outcome: (0, mysql_core_1.varchar)('outcome', { length: 16 }),
    closedAt: (0, mysql_core_1.timestamp)('closed_at'),
});
