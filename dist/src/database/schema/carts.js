"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartsTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const users_1 = require("./users");
exports.cartsTable = (0, mysql_core_1.mysqlTable)('Carts', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    retailerId: (0, mysql_core_1.int)('retailer_id')
        .notNull()
        .references(() => users_1.usersTable.id, { onDelete: 'cascade' }),
    createdAt: (0, mysql_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => [(0, mysql_core_1.uniqueIndex)('carts_retailer_uq').on(table.retailerId)]);
