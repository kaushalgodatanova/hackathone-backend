"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockMovementsTable = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const products_1 = require("./products");
const users_1 = require("./users");
exports.stockMovementsTable = (0, mysql_core_1.mysqlTable)('Stock_movements', {
    id: (0, mysql_core_1.int)('id').primaryKey().notNull().autoincrement(),
    productId: (0, mysql_core_1.int)('product_id')
        .notNull()
        .references(() => products_1.productsTable.id, { onDelete: 'cascade' }),
    createdAt: (0, mysql_core_1.timestamp)('created_at').notNull().defaultNow(),
    changeKind: (0, mysql_core_1.varchar)('change_kind', { length: 16 }).notNull(),
    delta: (0, mysql_core_1.int)('delta').notNull(),
    quantityAfter: (0, mysql_core_1.int)('quantity_after').notNull(),
    actorUserId: (0, mysql_core_1.int)('actor_user_id').references(() => users_1.usersTable.id, { onDelete: 'set null' }),
    note: (0, mysql_core_1.varchar)('note', { length: 512 }),
});
