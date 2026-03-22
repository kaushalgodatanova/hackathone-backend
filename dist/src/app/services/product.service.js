"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../database/db");
const products_1 = require("../../database/schema/products");
const stock_movements_1 = require("../../database/schema/stock_movements");
const AppError_1 = require("../../utils/AppError");
function isDuplicateKeyError(err) {
    return typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_DUP_ENTRY';
}
function toProductJson(row) {
    return {
        id: row.id,
        distributorId: row.distributorId,
        name: row.name,
        sku: row.sku,
        weightKg: row.weightKg,
        quantityOnHand: row.quantityOnHand,
        unitPrice: row.unitPrice,
        isActive: row.isActive,
    };
}
function toMovementJson(row) {
    return {
        id: row.id,
        productId: row.productId,
        createdAt: row.createdAt,
        changeKind: row.changeKind,
        delta: row.delta,
        quantityAfter: row.quantityAfter,
        actorUserId: row.actorUserId,
        note: row.note,
    };
}
class ProductService {
    static async listForDistributor(distributorId) {
        console.log('listForDistributor', distributorId);
        try {
            const rows = await db_1.db
                .select()
                .from(products_1.productsTable)
                .where((0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId))
                .orderBy((0, drizzle_orm_1.desc)(products_1.productsTable.id));
            return rows.map(toProductJson);
        }
        catch (error) {
            console.error('Error listing products for distributor', error);
            throw error;
        }
    }
    static async getByIdForDistributor(productId, distributorId) {
        const [row] = await db_1.db
            .select()
            .from(products_1.productsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId), (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId)))
            .limit(1);
        return row ? toProductJson(row) : null;
    }
    static async create(distributorId, actorUserId, body) {
        const initialQty = body.quantityOnHand ?? 0;
        try {
            return await db_1.db.transaction(async (tx) => {
                const [inserted] = await tx
                    .insert(products_1.productsTable)
                    .values({
                    distributorId,
                    name: body.name,
                    sku: body.sku,
                    weightKg: String(body.weightKg),
                    quantityOnHand: initialQty,
                    unitPrice: String(body.unitPrice),
                    isActive: body.isActive ?? true,
                })
                    .$returningId();
                const insertId = inserted.id;
                if (initialQty > 0) {
                    await tx.insert(stock_movements_1.stockMovementsTable).values({
                        productId: insertId,
                        changeKind: 'add',
                        delta: initialQty,
                        quantityAfter: initialQty,
                        actorUserId,
                        note: 'initial stock',
                    });
                }
                const [created] = await tx
                    .select()
                    .from(products_1.productsTable)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, insertId), (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId)))
                    .limit(1);
                if (!created)
                    throw AppError_1.AppError.notFound('Product not found after insert');
                return toProductJson(created);
            });
        }
        catch (err) {
            if (isDuplicateKeyError(err)) {
                throw AppError_1.AppError.conflict('SKU already exists for this distributor');
            }
            throw err;
        }
    }
    static async update(productId, distributorId, body) {
        try {
            const [res] = (await db_1.db
                .update(products_1.productsTable)
                .set({
                ...(body.name !== undefined ? { name: body.name } : {}),
                ...(body.sku !== undefined ? { sku: body.sku } : {}),
                ...(body.weightKg !== undefined ? { weightKg: String(body.weightKg) } : {}),
                ...(body.unitPrice !== undefined ? { unitPrice: String(body.unitPrice) } : {}),
                ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId), (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId))));
            if (res.affectedRows === 0) {
                const exists = await ProductService.getByIdForDistributor(productId, distributorId);
                if (!exists)
                    throw AppError_1.AppError.notFound('Product not found');
            }
            const updated = await ProductService.getByIdForDistributor(productId, distributorId);
            if (!updated)
                throw AppError_1.AppError.notFound('Product not found');
            return updated;
        }
        catch (err) {
            if (isDuplicateKeyError(err)) {
                throw AppError_1.AppError.conflict('SKU already exists for this distributor');
            }
            throw err;
        }
    }
    static async deleteHard(productId, distributorId) {
        const [res] = (await db_1.db
            .delete(products_1.productsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId), (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId))));
        if (res.affectedRows === 0) {
            throw AppError_1.AppError.notFound('Product not found');
        }
    }
    static async addStock(productId, distributorId, actorUserId, body) {
        return db_1.db.transaction(async (tx) => {
            const [row] = await tx
                .select()
                .from(products_1.productsTable)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId), (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId)))
                .limit(1);
            if (!row)
                throw AppError_1.AppError.notFound('Product not found');
            const next = row.quantityOnHand + body.amount;
            await tx.update(products_1.productsTable).set({ quantityOnHand: next }).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId));
            await tx.insert(stock_movements_1.stockMovementsTable).values({
                productId,
                changeKind: 'add',
                delta: body.amount,
                quantityAfter: next,
                actorUserId,
                note: body.note ?? null,
            });
            const [mov] = await tx
                .select()
                .from(stock_movements_1.stockMovementsTable)
                .where((0, drizzle_orm_1.eq)(stock_movements_1.stockMovementsTable.productId, productId))
                .orderBy((0, drizzle_orm_1.desc)(stock_movements_1.stockMovementsTable.id))
                .limit(1);
            const [refreshed] = await tx.select().from(products_1.productsTable).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId)).limit(1);
            if (!mov || !refreshed)
                throw AppError_1.AppError.notFound('Stock update failed');
            return { product: toProductJson(refreshed), movement: toMovementJson(mov) };
        });
    }
    static async removeStock(productId, distributorId, actorUserId, body) {
        return db_1.db.transaction(async (tx) => {
            const [row] = await tx
                .select()
                .from(products_1.productsTable)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId), (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId)))
                .limit(1);
            if (!row)
                throw AppError_1.AppError.notFound('Product not found');
            if (row.quantityOnHand < body.amount) {
                throw AppError_1.AppError.badRequest('Insufficient stock');
            }
            const next = row.quantityOnHand - body.amount;
            await tx.update(products_1.productsTable).set({ quantityOnHand: next }).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId));
            await tx.insert(stock_movements_1.stockMovementsTable).values({
                productId,
                changeKind: 'remove',
                delta: -body.amount,
                quantityAfter: next,
                actorUserId,
                note: body.note ?? null,
            });
            const [mov] = await tx
                .select()
                .from(stock_movements_1.stockMovementsTable)
                .where((0, drizzle_orm_1.eq)(stock_movements_1.stockMovementsTable.productId, productId))
                .orderBy((0, drizzle_orm_1.desc)(stock_movements_1.stockMovementsTable.id))
                .limit(1);
            const [refreshed] = await tx.select().from(products_1.productsTable).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId)).limit(1);
            if (!mov || !refreshed)
                throw AppError_1.AppError.notFound('Stock update failed');
            return { product: toProductJson(refreshed), movement: toMovementJson(mov) };
        });
    }
    static async setStock(productId, distributorId, actorUserId, body) {
        return db_1.db.transaction(async (tx) => {
            const [row] = await tx
                .select()
                .from(products_1.productsTable)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId), (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId)))
                .limit(1);
            if (!row)
                throw AppError_1.AppError.notFound('Product not found');
            const delta = body.quantity - row.quantityOnHand;
            await tx.update(products_1.productsTable).set({ quantityOnHand: body.quantity }).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId));
            await tx.insert(stock_movements_1.stockMovementsTable).values({
                productId,
                changeKind: 'set',
                delta,
                quantityAfter: body.quantity,
                actorUserId,
                note: body.note ?? null,
            });
            const [mov] = await tx
                .select()
                .from(stock_movements_1.stockMovementsTable)
                .where((0, drizzle_orm_1.eq)(stock_movements_1.stockMovementsTable.productId, productId))
                .orderBy((0, drizzle_orm_1.desc)(stock_movements_1.stockMovementsTable.id))
                .limit(1);
            const [refreshed] = await tx.select().from(products_1.productsTable).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId)).limit(1);
            if (!mov || !refreshed)
                throw AppError_1.AppError.notFound('Stock update failed');
            return { product: toProductJson(refreshed), movement: toMovementJson(mov) };
        });
    }
    static async listMovements(productId, distributorId, limit, offset) {
        const exists = await ProductService.getByIdForDistributor(productId, distributorId);
        if (!exists)
            throw AppError_1.AppError.notFound('Product not found');
        const rows = await db_1.db
            .select()
            .from(stock_movements_1.stockMovementsTable)
            .where((0, drizzle_orm_1.eq)(stock_movements_1.stockMovementsTable.productId, productId))
            .orderBy((0, drizzle_orm_1.desc)(stock_movements_1.stockMovementsTable.id))
            .limit(limit)
            .offset(offset);
        return {
            rows: rows.map(toMovementJson),
            limit,
            offset,
        };
    }
}
exports.ProductService = ProductService;
