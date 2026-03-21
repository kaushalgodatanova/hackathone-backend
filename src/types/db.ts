import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { productsTable } from '../database/schema/products';
import { stockMovementsTable } from '../database/schema/stock_movements';
import { usersTable } from '../database/schema/users';

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;
export type Product = InferSelectModel<typeof productsTable>;
export type NewProduct = InferInsertModel<typeof productsTable>;
export type StockMovement = InferSelectModel<typeof stockMovementsTable>;
export type NewStockMovement = InferInsertModel<typeof stockMovementsTable>;
