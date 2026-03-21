import { and, desc, eq } from 'drizzle-orm';
import type { ResultSetHeader } from 'mysql2';
import type { z } from 'zod';

import { db } from '../../database/db';
import { productsTable } from '../../database/schema/products';
import { stockMovementsTable } from '../../database/schema/stock_movements';
import { AppError } from '../../utils/AppError';
import {
  createProductBody,
  productResponseSchema,
  updateProductBody,
  type StockMovementJson,
} from '../../validators/product.validator';
import { stockAddBody, stockRemoveBody, stockSetBody } from '../../validators/stock.validator';

type CreateProductInput = z.infer<typeof createProductBody>;
type UpdateProductInput = z.infer<typeof updateProductBody>;
type StockAddInput = z.infer<typeof stockAddBody>;
type StockRemoveInput = z.infer<typeof stockRemoveBody>;
type StockSetInput = z.infer<typeof stockSetBody>;

export type ProductJson = z.infer<typeof productResponseSchema>;

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ER_DUP_ENTRY';
}

function toProductJson(row: typeof productsTable.$inferSelect): ProductJson {
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

function toMovementJson(row: typeof stockMovementsTable.$inferSelect): StockMovementJson {
  return {
    id: row.id,
    productId: row.productId,
    createdAt: row.createdAt,
    changeKind: row.changeKind as StockMovementJson['changeKind'],
    delta: row.delta,
    quantityAfter: row.quantityAfter,
    actorUserId: row.actorUserId,
    note: row.note,
  };
}

export class ProductService {
  static async listForDistributor(distributorId: number): Promise<ProductJson[]> {
    console.log('listForDistributor', distributorId);
    try {
      const rows = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.distributorId, distributorId))
        .orderBy(desc(productsTable.id));
      return rows.map(toProductJson);
    } catch (error) {
      console.error('Error listing products for distributor', error);
      throw error;
    }
  }

  static async getByIdForDistributor(productId: number, distributorId: number): Promise<ProductJson | null> {
    const [row] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.distributorId, distributorId)))
      .limit(1);
    return row ? toProductJson(row) : null;
  }

  static async create(distributorId: number, actorUserId: number, body: CreateProductInput): Promise<ProductJson> {
    const initialQty = body.quantityOnHand ?? 0;
    try {
      return await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(productsTable)
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
          await tx.insert(stockMovementsTable).values({
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
          .from(productsTable)
          .where(and(eq(productsTable.id, insertId), eq(productsTable.distributorId, distributorId)))
          .limit(1);
        if (!created) throw AppError.notFound('Product not found after insert');
        return toProductJson(created);
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw AppError.conflict('SKU already exists for this distributor');
      }
      throw err;
    }
  }

  static async update(productId: number, distributorId: number, body: UpdateProductInput): Promise<ProductJson> {
    try {
      const [res] = (await db
        .update(productsTable)
        .set({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.sku !== undefined ? { sku: body.sku } : {}),
          ...(body.weightKg !== undefined ? { weightKg: String(body.weightKg) } : {}),
          ...(body.unitPrice !== undefined ? { unitPrice: String(body.unitPrice) } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        })
        .where(and(eq(productsTable.id, productId), eq(productsTable.distributorId, distributorId)))) as unknown as [
        ResultSetHeader,
      ];

      if (res.affectedRows === 0) {
        const exists = await ProductService.getByIdForDistributor(productId, distributorId);
        if (!exists) throw AppError.notFound('Product not found');
      }

      const updated = await ProductService.getByIdForDistributor(productId, distributorId);
      if (!updated) throw AppError.notFound('Product not found');
      return updated;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw AppError.conflict('SKU already exists for this distributor');
      }
      throw err;
    }
  }

  static async deleteHard(productId: number, distributorId: number): Promise<void> {
    const [res] = (await db
      .delete(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.distributorId, distributorId)))) as unknown as [
      ResultSetHeader,
    ];
    if (res.affectedRows === 0) {
      throw AppError.notFound('Product not found');
    }
  }

  static async addStock(
    productId: number,
    distributorId: number,
    actorUserId: number,
    body: StockAddInput,
  ): Promise<{ product: ProductJson; movement: StockMovementJson }> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.id, productId), eq(productsTable.distributorId, distributorId)))
        .limit(1);
      if (!row) throw AppError.notFound('Product not found');

      const next = row.quantityOnHand + body.amount;
      await tx.update(productsTable).set({ quantityOnHand: next }).where(eq(productsTable.id, productId));

      await tx.insert(stockMovementsTable).values({
        productId,
        changeKind: 'add',
        delta: body.amount,
        quantityAfter: next,
        actorUserId,
        note: body.note ?? null,
      });

      const [mov] = await tx
        .select()
        .from(stockMovementsTable)
        .where(eq(stockMovementsTable.productId, productId))
        .orderBy(desc(stockMovementsTable.id))
        .limit(1);

      const [refreshed] = await tx.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);

      if (!mov || !refreshed) throw AppError.notFound('Stock update failed');
      return { product: toProductJson(refreshed), movement: toMovementJson(mov) };
    });
  }

  static async removeStock(
    productId: number,
    distributorId: number,
    actorUserId: number,
    body: StockRemoveInput,
  ): Promise<{ product: ProductJson; movement: StockMovementJson }> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.id, productId), eq(productsTable.distributorId, distributorId)))
        .limit(1);
      if (!row) throw AppError.notFound('Product not found');
      if (row.quantityOnHand < body.amount) {
        throw AppError.badRequest('Insufficient stock');
      }

      const next = row.quantityOnHand - body.amount;
      await tx.update(productsTable).set({ quantityOnHand: next }).where(eq(productsTable.id, productId));

      await tx.insert(stockMovementsTable).values({
        productId,
        changeKind: 'remove',
        delta: -body.amount,
        quantityAfter: next,
        actorUserId,
        note: body.note ?? null,
      });

      const [mov] = await tx
        .select()
        .from(stockMovementsTable)
        .where(eq(stockMovementsTable.productId, productId))
        .orderBy(desc(stockMovementsTable.id))
        .limit(1);

      const [refreshed] = await tx.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);

      if (!mov || !refreshed) throw AppError.notFound('Stock update failed');
      return { product: toProductJson(refreshed), movement: toMovementJson(mov) };
    });
  }

  static async setStock(
    productId: number,
    distributorId: number,
    actorUserId: number,
    body: StockSetInput,
  ): Promise<{ product: ProductJson; movement: StockMovementJson }> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.id, productId), eq(productsTable.distributorId, distributorId)))
        .limit(1);
      if (!row) throw AppError.notFound('Product not found');

      const delta = body.quantity - row.quantityOnHand;
      await tx.update(productsTable).set({ quantityOnHand: body.quantity }).where(eq(productsTable.id, productId));

      await tx.insert(stockMovementsTable).values({
        productId,
        changeKind: 'set',
        delta,
        quantityAfter: body.quantity,
        actorUserId,
        note: body.note ?? null,
      });

      const [mov] = await tx
        .select()
        .from(stockMovementsTable)
        .where(eq(stockMovementsTable.productId, productId))
        .orderBy(desc(stockMovementsTable.id))
        .limit(1);

      const [refreshed] = await tx.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);

      if (!mov || !refreshed) throw AppError.notFound('Stock update failed');
      return { product: toProductJson(refreshed), movement: toMovementJson(mov) };
    });
  }

  static async listMovements(
    productId: number,
    distributorId: number,
    limit: number,
    offset: number,
  ): Promise<{ rows: StockMovementJson[]; limit: number; offset: number }> {
    const exists = await ProductService.getByIdForDistributor(productId, distributorId);
    if (!exists) throw AppError.notFound('Product not found');

    const rows = await db
      .select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.productId, productId))
      .orderBy(desc(stockMovementsTable.id))
      .limit(limit)
      .offset(offset);

    return {
      rows: rows.map(toMovementJson),
      limit,
      offset,
    };
  }
}
