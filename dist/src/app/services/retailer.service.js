"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetailerService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const batch_service_1 = require("./batch.service");
const db_1 = require("../../database/db");
const cart_items_1 = require("../../database/schema/cart_items");
const carts_1 = require("../../database/schema/carts");
const products_1 = require("../../database/schema/products");
const retailer_order_items_1 = require("../../database/schema/retailer_order_items");
const retailer_orders_1 = require("../../database/schema/retailer_orders");
const stock_movements_1 = require("../../database/schema/stock_movements");
const users_1 = require("../../database/schema/users");
const AppError_1 = require("../../utils/AppError");
function num(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string')
        return Number(v);
    return 0;
}
function decStr(v) {
    return typeof v === 'string' ? v : String(num(v));
}
class RetailerService {
    static async listDistributors() {
        const rows = await db_1.db
            .select({ id: users_1.usersTable.id, name: users_1.usersTable.name })
            .from(users_1.usersTable)
            .where((0, drizzle_orm_1.eq)(users_1.usersTable.role, 'distributor'))
            .orderBy(users_1.usersTable.name);
        return rows;
    }
    static async getCatalog(distributorId) {
        const rows = await db_1.db
            .select()
            .from(products_1.productsTable)
            .where((0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId))
            .orderBy((0, drizzle_orm_1.desc)(products_1.productsTable.id));
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
    static async getOrCreateCartId(retailerId) {
        const [existing] = await db_1.db.select().from(carts_1.cartsTable).where((0, drizzle_orm_1.eq)(carts_1.cartsTable.retailerId, retailerId)).limit(1);
        if (existing)
            return existing.id;
        await db_1.db.insert(carts_1.cartsTable).values({ retailerId });
        const [created] = await db_1.db.select().from(carts_1.cartsTable).where((0, drizzle_orm_1.eq)(carts_1.cartsTable.retailerId, retailerId)).limit(1);
        if (!created)
            throw AppError_1.AppError.badRequest('Could not create cart');
        return created.id;
    }
    static async getCart(retailerId) {
        const cartId = await RetailerService.getOrCreateCartId(retailerId);
        const rows = await db_1.db
            .select({
            item: cart_items_1.cartItemsTable,
            product: products_1.productsTable,
            distributorName: users_1.usersTable.name,
        })
            .from(cart_items_1.cartItemsTable)
            .innerJoin(products_1.productsTable, (0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.productId, products_1.productsTable.id))
            .innerJoin(users_1.usersTable, (0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, users_1.usersTable.id))
            .where((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.cartId, cartId));
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
    static async getCatalogForNlMatching(distributorId) {
        const rows = await db_1.db
            .select()
            .from(products_1.productsTable)
            .where((0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId))
            .orderBy((0, drizzle_orm_1.desc)(products_1.productsTable.id));
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
    static async addLinesToCartMerge(retailerId, additions) {
        const cart = await RetailerService.getCart(retailerId);
        const qtyByProduct = new Map();
        for (const i of cart.items) {
            qtyByProduct.set(i.productId, i.quantity);
        }
        for (const { productId, quantity } of additions) {
            if (quantity <= 0)
                continue;
            const prev = qtyByProduct.get(productId) ?? 0;
            const next = prev + quantity;
            await RetailerService.upsertCartItem(retailerId, productId, next);
            qtyByProduct.set(productId, next);
        }
    }
    static async assertProductsBelongToDistributor(productIds, distributorId) {
        if (productIds.length === 0)
            return;
        const unique = [...new Set(productIds)];
        const rows = await db_1.db
            .select({ id: products_1.productsTable.id })
            .from(products_1.productsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.distributorId, distributorId), (0, drizzle_orm_1.inArray)(products_1.productsTable.id, unique)));
        if (rows.length !== unique.length) {
            throw AppError_1.AppError.badRequest('One or more products are invalid for this distributor');
        }
    }
    static async upsertCartItem(retailerId, productId, quantity) {
        const cartId = await RetailerService.getOrCreateCartId(retailerId);
        const [product] = await db_1.db.select().from(products_1.productsTable).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, productId)).limit(1);
        if (!product)
            throw AppError_1.AppError.notFound('Product not found');
        if (quantity === 0) {
            await db_1.db
                .delete(cart_items_1.cartItemsTable)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.cartId, cartId), (0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.productId, productId)));
            return;
        }
        if (!product.isActive) {
            throw AppError_1.AppError.badRequest('This product is not available for purchase');
        }
        if (quantity > product.quantityOnHand) {
            throw AppError_1.AppError.badRequest(`Only ${product.quantityOnHand} units in stock`, {
                productId,
                maxQuantity: product.quantityOnHand,
            });
        }
        const [existing] = await db_1.db
            .select()
            .from(cart_items_1.cartItemsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.cartId, cartId), (0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.productId, productId)))
            .limit(1);
        if (existing) {
            await db_1.db.update(cart_items_1.cartItemsTable).set({ quantity }).where((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.id, existing.id));
        }
        else {
            await db_1.db.insert(cart_items_1.cartItemsTable).values({ cartId, productId, quantity });
        }
    }
    static async removeCartItem(retailerId, productId) {
        const [cart] = await db_1.db.select().from(carts_1.cartsTable).where((0, drizzle_orm_1.eq)(carts_1.cartsTable.retailerId, retailerId)).limit(1);
        if (!cart)
            return;
        await db_1.db
            .delete(cart_items_1.cartItemsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.cartId, cart.id), (0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.productId, productId)));
    }
    static async clearCart(retailerId) {
        const [cart] = await db_1.db.select().from(carts_1.cartsTable).where((0, drizzle_orm_1.eq)(carts_1.cartsTable.retailerId, retailerId)).limit(1);
        if (!cart)
            return;
        await db_1.db.delete(cart_items_1.cartItemsTable).where((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.cartId, cart.id));
    }
    static async checkout(retailerId, options) {
        const cartId = await RetailerService.getOrCreateCartId(retailerId);
        return db_1.db.transaction(async (tx) => {
            const [user] = await tx.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, retailerId)).limit(1);
            if (!user)
                throw AppError_1.AppError.badRequest('User not found');
            const siteId = options?.deliverySiteId ?? user.defaultDeliverySiteId;
            if (!siteId) {
                throw AppError_1.AppError.badRequest('Choose a delivery location in your profile or pass deliverySiteId when checking out.');
            }
            const batchId = await batch_service_1.BatchService.getOrCreateOpenBatchId(tx);
            const rows = await tx
                .select({
                item: cart_items_1.cartItemsTable,
                product: products_1.productsTable,
            })
                .from(cart_items_1.cartItemsTable)
                .innerJoin(products_1.productsTable, (0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.productId, products_1.productsTable.id))
                .where((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.cartId, cartId));
            if (rows.length === 0)
                throw AppError_1.AppError.badRequest('Cart is empty');
            const invalidItems = [];
            for (const { item, product } of rows) {
                if (!product.isActive) {
                    invalidItems.push({ productId: product.id, reason: 'inactive' });
                }
                else if (item.quantity > product.quantityOnHand) {
                    invalidItems.push({
                        productId: product.id,
                        reason: 'insufficient_stock',
                        maxQuantity: product.quantityOnHand,
                    });
                }
            }
            if (invalidItems.length > 0) {
                throw AppError_1.AppError.badRequest('Some items are unavailable or exceed stock. Update your cart and try again.', {
                    invalidItems,
                });
            }
            const byDist = new Map();
            for (const { item, product } of rows) {
                const unitPrice = num(product.unitPrice);
                const lineTotal = Math.round(item.quantity * unitPrice * 100) / 100;
                const line = {
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
            const createdOrders = [];
            for (const [distributorId, lines] of byDist) {
                const orderTotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
                const [orderIns] = await tx
                    .insert(retailer_orders_1.retailerOrdersTable)
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
                    await tx.insert(retailer_order_items_1.retailerOrderItemsTable).values({
                        orderId,
                        productId: line.productId,
                        quantity: line.quantity,
                        unitPrice: decStr(line.unitPrice),
                        lineTotal: decStr(line.lineTotal),
                    });
                    const [upd] = (await tx
                        .update(products_1.productsTable)
                        .set({
                        quantityOnHand: (0, drizzle_orm_1.sql) `${products_1.productsTable.quantityOnHand} - ${line.quantity}`,
                    })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(products_1.productsTable.id, line.productId), (0, drizzle_orm_1.gte)(products_1.productsTable.quantityOnHand, line.quantity))));
                    if (!upd || upd.affectedRows !== 1) {
                        throw AppError_1.AppError.conflict('Stock changed while checking out. Refresh your cart and try again.');
                    }
                    const [after] = await tx.select().from(products_1.productsTable).where((0, drizzle_orm_1.eq)(products_1.productsTable.id, line.productId)).limit(1);
                    if (!after)
                        throw AppError_1.AppError.badRequest('Product missing after update');
                    await tx.insert(stock_movements_1.stockMovementsTable).values({
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
            await tx.delete(cart_items_1.cartItemsTable).where((0, drizzle_orm_1.eq)(cart_items_1.cartItemsTable.cartId, cartId));
            return { orders: createdOrders };
        });
    }
    static async listOrders(retailerId, limit, offset) {
        const orderRows = await db_1.db
            .select({
            order: retailer_orders_1.retailerOrdersTable,
            distributorName: users_1.usersTable.name,
        })
            .from(retailer_orders_1.retailerOrdersTable)
            .innerJoin(users_1.usersTable, (0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.distributorId, users_1.usersTable.id))
            .where((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.retailerId, retailerId))
            .orderBy((0, drizzle_orm_1.desc)(retailer_orders_1.retailerOrdersTable.id))
            .limit(limit)
            .offset(offset);
        const orders = [];
        for (const { order, distributorName } of orderRows) {
            const itemRows = await db_1.db
                .select({
                line: retailer_order_items_1.retailerOrderItemsTable,
                productName: products_1.productsTable.name,
            })
                .from(retailer_order_items_1.retailerOrderItemsTable)
                .innerJoin(products_1.productsTable, (0, drizzle_orm_1.eq)(retailer_order_items_1.retailerOrderItemsTable.productId, products_1.productsTable.id))
                .where((0, drizzle_orm_1.eq)(retailer_order_items_1.retailerOrderItemsTable.orderId, order.id));
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
    static async getOrderStatsForDistributor(distributorId) {
        const [{ total: totalRaw }] = await db_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(retailer_orders_1.retailerOrdersTable)
            .where((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.distributorId, distributorId));
        const [{ placed: placedRaw }] = await db_1.db
            .select({ placed: (0, drizzle_orm_1.count)() })
            .from(retailer_orders_1.retailerOrdersTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.distributorId, distributorId), (0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.status, 'placed')));
        return {
            total: Number(totalRaw),
            placed: Number(placedRaw),
        };
    }
    static async listOrdersForDistributor(distributorId, limit, offset) {
        const [{ total: totalRaw }] = await db_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(retailer_orders_1.retailerOrdersTable)
            .where((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.distributorId, distributorId));
        const total = Number(totalRaw);
        const orderRows = await db_1.db
            .select({
            order: retailer_orders_1.retailerOrdersTable,
            retailerName: users_1.usersTable.name,
        })
            .from(retailer_orders_1.retailerOrdersTable)
            .innerJoin(users_1.usersTable, (0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.retailerId, users_1.usersTable.id))
            .where((0, drizzle_orm_1.eq)(retailer_orders_1.retailerOrdersTable.distributorId, distributorId))
            .orderBy((0, drizzle_orm_1.desc)(retailer_orders_1.retailerOrdersTable.id))
            .limit(limit)
            .offset(offset);
        const orders = [];
        for (const { order, retailerName } of orderRows) {
            const itemRows = await db_1.db
                .select({
                line: retailer_order_items_1.retailerOrderItemsTable,
                productName: products_1.productsTable.name,
            })
                .from(retailer_order_items_1.retailerOrderItemsTable)
                .innerJoin(products_1.productsTable, (0, drizzle_orm_1.eq)(retailer_order_items_1.retailerOrderItemsTable.productId, products_1.productsTable.id))
                .where((0, drizzle_orm_1.eq)(retailer_order_items_1.retailerOrderItemsTable.orderId, order.id));
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
exports.RetailerService = RetailerService;
