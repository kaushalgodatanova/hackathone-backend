"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockAdjustResponseSchema = exports.stockSetBody = exports.stockRemoveBody = exports.stockAddBody = void 0;
exports.registerStockOpenApiSchemas = registerStockOpenApiSchemas;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const zod_1 = require("zod");
const product_validator_1 = require("./product.validator");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.stockAddBody = zod_1.z.object({
    amount: zod_1.z.number().int().positive().openapi({ example: 10, description: 'Units to add' }),
    note: zod_1.z.string().max(512).optional(),
});
exports.stockRemoveBody = zod_1.z.object({
    amount: zod_1.z.number().int().positive().openapi({ example: 5, description: 'Units to remove' }),
    note: zod_1.z.string().max(512).optional(),
});
exports.stockSetBody = zod_1.z.object({
    quantity: zod_1.z.number().int().min(0).openapi({ example: 42, description: 'Absolute on-hand quantity' }),
    note: zod_1.z.string().max(512).optional(),
});
exports.stockAdjustResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.object({
        product: product_validator_1.productResponseSchema,
        movement: product_validator_1.stockMovementRowSchema,
    }),
});
function registerStockOpenApiSchemas(registry) {
    registry.register('StockAddBody', exports.stockAddBody);
    registry.register('StockRemoveBody', exports.stockRemoveBody);
    registry.register('StockSetBody', exports.stockSetBody);
    registry.register('StockAdjustResponse', exports.stockAdjustResponseSchema);
}
