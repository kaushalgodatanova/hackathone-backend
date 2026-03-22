"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockMovementsListResponseSchema = exports.stockMovementRowSchema = exports.stockMovementsQuery = exports.productDeletedResponseSchema = exports.productSingleResponseSchema = exports.productListResponseSchema = exports.productResponseSchema = exports.updateProductBody = exports.createProductBody = exports.productIdParams = void 0;
exports.registerProductOpenApiSchemas = registerProductOpenApiSchemas;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const zod_1 = require("zod");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.productIdParams = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive().openapi({ example: 1, description: 'Product id' }),
});
exports.createProductBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).openapi({ example: 'Whole milk 1L' }),
    sku: zod_1.z.string().min(1).max(128).openapi({ example: 'MILK-1L' }),
    weightKg: zod_1.z.number().positive().openapi({ example: 1.03, description: 'Kilograms per unit' }),
    quantityOnHand: zod_1.z.number().int().min(0).default(0).openapi({ example: 100 }),
    unitPrice: zod_1.z.number().nonnegative().openapi({ example: 2.5 }),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.updateProductBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    sku: zod_1.z.string().min(1).max(128).optional(),
    weightKg: zod_1.z.number().positive().optional(),
    unitPrice: zod_1.z.number().nonnegative().optional(),
    isActive: zod_1.z.boolean().optional(),
});
const decimalish = zod_1.z.union([zod_1.z.string(), zod_1.z.number()]);
/** API shape (decimals serialized as strings). */
exports.productResponseSchema = zod_1.z.object({
    id: zod_1.z.number().int(),
    distributorId: zod_1.z.number().int(),
    name: zod_1.z.string(),
    sku: zod_1.z.string(),
    weightKg: decimalish,
    quantityOnHand: zod_1.z.number().int(),
    unitPrice: decimalish,
    isActive: zod_1.z.boolean(),
});
exports.productListResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(exports.productResponseSchema),
});
exports.productSingleResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: exports.productResponseSchema,
});
exports.productDeletedResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
});
exports.stockMovementsQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(50).openapi({ example: 50 }),
    offset: zod_1.z.coerce.number().int().min(0).optional().default(0).openapi({ example: 0 }),
});
exports.stockMovementRowSchema = zod_1.z.object({
    id: zod_1.z.number().int(),
    productId: zod_1.z.number().int(),
    createdAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]),
    changeKind: zod_1.z.enum(['add', 'remove', 'set']),
    delta: zod_1.z.number().int(),
    quantityAfter: zod_1.z.number().int(),
    actorUserId: zod_1.z.number().int().nullable(),
    note: zod_1.z.string().nullable(),
});
exports.stockMovementsListResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(exports.stockMovementRowSchema),
    meta: zod_1.z.object({
        limit: zod_1.z.number().int(),
        offset: zod_1.z.number().int(),
    }),
});
function registerProductOpenApiSchemas(registry) {
    registry.register('ProductIdParams', exports.productIdParams);
    registry.register('CreateProductBody', exports.createProductBody);
    registry.register('UpdateProductBody', exports.updateProductBody);
    registry.register('ProductResponse', exports.productResponseSchema);
    registry.register('ProductListResponse', exports.productListResponseSchema);
    registry.register('ProductSingleResponse', exports.productSingleResponseSchema);
    registry.register('ProductDeletedResponse', exports.productDeletedResponseSchema);
    registry.register('StockMovementsQuery', exports.stockMovementsQuery);
    registry.register('StockMovementRow', exports.stockMovementRowSchema);
    registry.register('StockMovementsListResponse', exports.stockMovementsListResponseSchema);
}
