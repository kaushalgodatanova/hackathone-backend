import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { ResultSetHeader } from 'mysql2';

import { BatchService } from './batch.service';
import { db } from '../../database/db';
import { cartItemsTable } from '../../database/schema/cart_items';
import { cartsTable } from '../../database/schema/carts';
import { productsTable } from '../../database/schema/products';
import { retailerOrderItemsTable } from '../../database/schema/retailer_order_items';
import { retailerOrdersTable } from '../../database/schema/retailer_orders';
import { stockMovementsTable } from '../../database/schema/stock_movements';
import { usersTable } from '../../database/schema/users';
import { AppError } from '../../utils/AppError';

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

function decStr(v: unknown): string {
  return typeof v === 'string' ? v : String(num(v));
}

export type InvalidCartItem = {
  productId: number;
  reason: 'inactive' | 'insufficient_stock';
  maxQuantity?: number;
};

export class RetailerService {
  static async listDistributors(): Promise<{ id: number; name: string }[]> {
    const rows = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.role, 'distributor'))
      .orderBy(usersTable.name);
    return rows;
  }

  static async getCatalog(distributorId: number): Promise<
    {
      id: number;
      productName: string;
      category: string | null;
      price: number;
      stock: number;
      isActive: boolean;
      unavailable: boolean;
    }[]
  > {
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.distributorId, distributorId))
      .orderBy(desc(productsTable.id));

    return rows.map((p) => {
      const stock = p.quantityOnHand;
      const isActive = p.isActive;
      const unavailable = !isActive || stock <= 0;
      return {
        id: p.id,
        productName: p.name,
        category: p.category ?? null,
        price: num(p.unitPrice),
        stock,
        isActive,
        unavailable,
      };
    });
  }

  static async getOrCreateCartId(retailerId: number): Promise<number> {
    const [existing] = await db.select().from(cartsTable).where(eq(cartsTable.retailerId, retailerId)).limit(1);
    if (existing) return existing.id;

    await db.insert(cartsTable).values({ retailerId });
    const [created] = await db.select().from(cartsTable).where(eq(cartsTable.retailerId, retailerId)).limit(1);
    if (!created) throw AppError.badRequest('Could not create cart');
    return created.id;
  }

  static async getCart(retailerId: number): Promise<{
    items: {
      productId: number;
      quantity: number;
      productName: string;
      category: string | null;
      unitPrice: number;
      stock: number;
      distributorId: number;
      distributorName: string;
      lineTotal: number;
      unavailable: boolean;
    }[];
    totalAmount: number;
  }> {
    const cartId = await RetailerService.getOrCreateCartId(retailerId);

    const rows = await db
      .select({
        item: cartItemsTable,
        product: productsTable,
        distributorName: usersTable.name,
      })
      .from(cartItemsTable)
      .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .innerJoin(usersTable, eq(productsTable.distributorId, usersTable.id))
      .where(eq(cartItemsTable.cartId, cartId));

    let totalAmount = 0;
    const items = rows.map(({ item, product, distributorName }) => {
      const unitPrice = num(product.unitPrice);
      const stock = product.quantityOnHand;
      const isActive = product.isActive;
      const unavailable = !isActive || item.quantity > stock;
      const lineTotal = item.quantity * unitPrice;
      totalAmount += lineTotal;
      return {
        productId: product.id,
        quantity: item.quantity,
        productName: product.name,
        category: product.category ?? null,
        unitPrice,
        stock,
        distributorId: product.distributorId,
        distributorName,
        lineTotal,
        unavailable,
      };
    });

    return { items, totalAmount: Math.round(totalAmount * 100) / 100 };
  }

  /** Catalog rows for NL matching (includes SKU). */
  static async getCatalogForNlMatching(distributorId: number): Promise<
    {
      id: number;
      productName: string;
      sku: string;
      category: string | null;
      price: number;
      stock: number;
      isActive: boolean;
      unavailable: boolean;
    }[]
  > {
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.distributorId, distributorId))
      .orderBy(desc(productsTable.id));

    return rows.map((p) => {
      const stock = p.quantityOnHand;
      const isActive = p.isActive;
      const unavailable = !isActive || stock <= 0;
      return {
        id: p.id,
        productName: p.name,
        sku: p.sku,
        category: p.category ?? null,
        price: num(p.unitPrice),
        stock,
        isActive,
        unavailable,
      };
    });
  }

  /** Add quantities to existing cart lines (merge). */
  static async addLinesToCartMerge(
    retailerId: number,
    additions: { productId: number; quantity: number }[],
  ): Promise<void> {
    const cart = await RetailerService.getCart(retailerId);
    const qtyByProduct = new Map<number, number>();
    for (const i of cart.items) {
      qtyByProduct.set(i.productId, i.quantity);
    }
    for (const { productId, quantity } of additions) {
      if (quantity <= 0) continue;
      const prev = qtyByProduct.get(productId) ?? 0;
      const next = prev + quantity;
      await RetailerService.upsertCartItem(retailerId, productId, next);
      qtyByProduct.set(productId, next);
    }
  }

  static async assertProductsBelongToDistributor(productIds: number[], distributorId: number): Promise<void> {
    if (productIds.length === 0) return;
    const unique = [...new Set(productIds)];
    const rows = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(and(eq(productsTable.distributorId, distributorId), inArray(productsTable.id, unique)));
    if (rows.length !== unique.length) {
      throw AppError.badRequest('One or more products are invalid for this distributor');
    }
  }

  static async upsertCartItem(retailerId: number, productId: number, quantity: number): Promise<void> {
    const cartId = await RetailerService.getOrCreateCartId(retailerId);

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (!product) throw AppError.notFound('Product not found');

    if (quantity === 0) {
      await db
        .delete(cartItemsTable)
        .where(and(eq(cartItemsTable.cartId, cartId), eq(cartItemsTable.productId, productId)));
      return;
    }

    if (!product.isActive) {
      throw AppError.badRequest('This product is not available for purchase');
    }
    if (quantity > product.quantityOnHand) {
      throw AppError.badRequest(`Only ${product.quantityOnHand} units in stock`, {
        productId,
        maxQuantity: product.quantityOnHand,
      });
    }

    const [existing] = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.cartId, cartId), eq(cartItemsTable.productId, productId)))
      .limit(1);

    if (existing) {
      await db.update(cartItemsTable).set({ quantity }).where(eq(cartItemsTable.id, existing.id));
    } else {
      await db.insert(cartItemsTable).values({ cartId, productId, quantity });
    }
  }

  static async removeCartItem(retailerId: number, productId: number): Promise<void> {
    const [cart] = await db.select().from(cartsTable).where(eq(cartsTable.retailerId, retailerId)).limit(1);
    if (!cart) return;
    await db
      .delete(cartItemsTable)
      .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, productId)));
  }

  static async clearCart(retailerId: number): Promise<void> {
    const [cart] = await db.select().from(cartsTable).where(eq(cartsTable.retailerId, retailerId)).limit(1);
    if (!cart) return;
    await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
  }

  static async checkout(
    retailerId: number,
    options?: { deliverySiteId?: number },
  ): Promise<{
    orders: {
      id: number;
      distributorId: number;
      totalAmount: number;
      batchId: number;
      deliverySiteId: number;
      items: { productId: number; quantity: number; unitPrice: number; lineTotal: number }[];
    }[];
  }> {
    const cartId = await RetailerService.getOrCreateCartId(retailerId);

    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, retailerId)).limit(1);
      if (!user) throw AppError.badRequest('User not found');
      const siteId = options?.deliverySiteId ?? user.defaultDeliverySiteId;
      if (!siteId) {
        throw AppError.badRequest(
          'Choose a delivery location in your profile or pass deliverySiteId when checking out.',
        );
      }
      const batchId = await BatchService.getOrCreateOpenBatchId(tx);
      const rows = await tx
        .select({
          item: cartItemsTable,
          product: productsTable,
        })
        .from(cartItemsTable)
        .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
        .where(eq(cartItemsTable.cartId, cartId));

      if (rows.length === 0) throw AppError.badRequest('Cart is empty');

      const invalidItems: InvalidCartItem[] = [];
      for (const { item, product } of rows) {
        if (!product.isActive) {
          invalidItems.push({ productId: product.id, reason: 'inactive' });
        } else if (item.quantity > product.quantityOnHand) {
          invalidItems.push({
            productId: product.id,
            reason: 'insufficient_stock',
            maxQuantity: product.quantityOnHand,
          });
        }
      }
      if (invalidItems.length > 0) {
        throw AppError.badRequest('Some items are unavailable or exceed stock. Update your cart and try again.', {
          invalidItems,
        });
      }

      type Line = {
        productId: number;
        distributorId: number;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      };

      const byDist = new Map<number, Line[]>();
      for (const { item, product } of rows) {
        const unitPrice = num(product.unitPrice);
        const lineTotal = Math.round(item.quantity * unitPrice * 100) / 100;
        const line: Line = {
          productId: product.id,
          distributorId: product.distributorId,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        };
        const list = byDist.get(product.distributorId) ?? [];
        list.push(line);
        byDist.set(product.distributorId, list);
      }

      const createdOrders: {
        id: number;
        distributorId: number;
        totalAmount: number;
        batchId: number;
        deliverySiteId: number;
        items: { productId: number; quantity: number; unitPrice: number; lineTotal: number }[];
      }[] = [];

      for (const [distributorId, lines] of byDist) {
        const orderTotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;

        const [orderIns] = await tx
          .insert(retailerOrdersTable)
          .values({
            retailerId,
            distributorId,
            batchId,
            deliverySiteId: siteId,
            status: 'placed',
            totalAmount: decStr(orderTotal),
          })
          .$returningId();

        const orderId = orderIns.id;

        for (const line of lines) {
          await tx.insert(retailerOrderItemsTable).values({
            orderId,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: decStr(line.unitPrice),
            lineTotal: decStr(line.lineTotal),
          });

          const [upd] = (await tx
            .update(productsTable)
            .set({
              quantityOnHand: sql`${productsTable.quantityOnHand} - ${line.quantity}`,
            })
            .where(
              and(eq(productsTable.id, line.productId), gte(productsTable.quantityOnHand, line.quantity)),
            )) as unknown as [ResultSetHeader];

          if (!upd || upd.affectedRows !== 1) {
            throw AppError.conflict('Stock changed while checking out. Refresh your cart and try again.');
          }

          const [after] = await tx.select().from(productsTable).where(eq(productsTable.id, line.productId)).limit(1);
          if (!after) throw AppError.badRequest('Product missing after update');

          await tx.insert(stockMovementsTable).values({
            productId: line.productId,
            changeKind: 'remove',
            delta: -line.quantity,
            quantityAfter: after.quantityOnHand,
            actorUserId: retailerId,
            note: `Retailer order #${orderId}`,
          });
        }

        createdOrders.push({
          id: orderId,
          distributorId,
          totalAmount: orderTotal,
          batchId,
          deliverySiteId: siteId,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        });
      }

      await tx.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartId));

      return { orders: createdOrders };
    });
  }

  static async listOrders(
    retailerId: number,
    limit: number,
    offset: number,
  ): Promise<{
    orders: {
      id: number;
      distributorId: number;
      distributorName: string;
      status: string;
      totalAmount: number;
      batchId: number | null;
      deliverySiteId: number | null;
      createdAt: Date;
      items: {
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }[];
    }[];
    meta: { limit: number; offset: number };
  }> {
    const orderRows = await db
      .select({
        order: retailerOrdersTable,
        distributorName: usersTable.name,
      })
      .from(retailerOrdersTable)
      .innerJoin(usersTable, eq(retailerOrdersTable.distributorId, usersTable.id))
      .where(eq(retailerOrdersTable.retailerId, retailerId))
      .orderBy(desc(retailerOrdersTable.id))
      .limit(limit)
      .offset(offset);

    const orders: {
      id: number;
      distributorId: number;
      distributorName: string;
      status: string;
      totalAmount: number;
      batchId: number | null;
      deliverySiteId: number | null;
      createdAt: Date;
      items: {
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }[];
    }[] = [];

    for (const { order, distributorName } of orderRows) {
      const itemRows = await db
        .select({
          line: retailerOrderItemsTable,
          productName: productsTable.name,
        })
        .from(retailerOrderItemsTable)
        .innerJoin(productsTable, eq(retailerOrderItemsTable.productId, productsTable.id))
        .where(eq(retailerOrderItemsTable.orderId, order.id));

      orders.push({
        id: order.id,
        distributorId: order.distributorId,
        distributorName,
        status: order.status,
        totalAmount: num(order.totalAmount),
        batchId: order.batchId ?? null,
        deliverySiteId: order.deliverySiteId ?? null,
        createdAt: order.createdAt,
        items: itemRows.map(({ line, productName }) => ({
          productId: line.productId,
          productName,
          quantity: line.quantity,
          unitPrice: num(line.unitPrice),
          lineTotal: num(line.lineTotal),
        })),
      });
    }

    return { orders, meta: { limit, offset } };
  }

  static async getOrderStatsForDistributor(distributorId: number): Promise<{
    total: number;
    placed: number;
  }> {
    const [{ total: totalRaw }] = await db
      .select({ total: count() })
      .from(retailerOrdersTable)
      .where(eq(retailerOrdersTable.distributorId, distributorId));

    const [{ placed: placedRaw }] = await db
      .select({ placed: count() })
      .from(retailerOrdersTable)
      .where(and(eq(retailerOrdersTable.distributorId, distributorId), eq(retailerOrdersTable.status, 'placed')));

    return {
      total: Number(totalRaw),
      placed: Number(placedRaw),
    };
  }

  static async listOrdersForDistributor(
    distributorId: number,
    limit: number,
    offset: number,
  ): Promise<{
    orders: {
      id: number;
      retailerId: number;
      retailerName: string;
      status: string;
      totalAmount: number;
      createdAt: Date;
      items: {
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }[];
    }[];
    meta: { limit: number; offset: number; total: number };
  }> {
    const [{ total: totalRaw }] = await db
      .select({ total: count() })
      .from(retailerOrdersTable)
      .where(eq(retailerOrdersTable.distributorId, distributorId));
    const total = Number(totalRaw);

    const orderRows = await db
      .select({
        order: retailerOrdersTable,
        retailerName: usersTable.name,
      })
      .from(retailerOrdersTable)
      .innerJoin(usersTable, eq(retailerOrdersTable.retailerId, usersTable.id))
      .where(eq(retailerOrdersTable.distributorId, distributorId))
      .orderBy(desc(retailerOrdersTable.id))
      .limit(limit)
      .offset(offset);

    const orders: {
      id: number;
      retailerId: number;
      retailerName: string;
      status: string;
      totalAmount: number;
      createdAt: Date;
      items: {
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }[];
    }[] = [];

    for (const { order, retailerName } of orderRows) {
      const itemRows = await db
        .select({
          line: retailerOrderItemsTable,
          productName: productsTable.name,
        })
        .from(retailerOrderItemsTable)
        .innerJoin(productsTable, eq(retailerOrderItemsTable.productId, productsTable.id))
        .where(eq(retailerOrderItemsTable.orderId, order.id));

      orders.push({
        id: order.id,
        retailerId: order.retailerId,
        retailerName,
        status: order.status,
        totalAmount: num(order.totalAmount),
        createdAt: order.createdAt,
        items: itemRows.map(({ line, productName }) => ({
          productId: line.productId,
          productName,
          quantity: line.quantity,
          unitPrice: num(line.unitPrice),
          lineTotal: num(line.lineTotal),
        })),
      });
    }

    return { orders, meta: { limit, offset, total } };
  }
}
