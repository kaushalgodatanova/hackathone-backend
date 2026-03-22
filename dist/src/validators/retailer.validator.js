"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogChatBody = exports.nlCartApplyBody = exports.nlCartPreviewBody = exports.checkoutBody = exports.ordersListQuery = exports.productIdParams = exports.cartItemBody = exports.distributorIdQuery = void 0;
exports.registerRetailerOpenApiSchemas = registerRetailerOpenApiSchemas;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const zod_1 = require("zod");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.distributorIdQuery = zod_1.z.object({
    distributorId: zod_1.z.coerce.number().int().positive().openapi({ example: 1 }),
});
exports.cartItemBody = zod_1.z.object({
    productId: zod_1.z.number().int().positive().openapi({ example: 1 }),
    quantity: zod_1.z.number().int().min(0).openapi({ example: 3, description: '0 removes the line' }),
});
exports.productIdParams = zod_1.z.object({
    productId: zod_1.z.coerce.number().int().positive().openapi({ example: 1 }),
});
exports.ordersListQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: zod_1.z.coerce.number().int().min(0).optional().default(0),
});
exports.checkoutBody = zod_1.z.object({
    deliverySiteId: zod_1.z.number().int().positive().optional().openapi({
        description: 'Override snapshot site; otherwise profile default_delivery_site_id is used.',
    }),
});
exports.nlCartPreviewBody = zod_1.z.object({
    distributorId: zod_1.z.number().int().positive().openapi({ example: 1 }),
    message: zod_1.z.string().min(1).max(8000).openapi({ example: '10 cases of water and 5 apple crates' }),
});
exports.nlCartApplyBody = zod_1.z.object({
    distributorId: zod_1.z.number().int().positive().openapi({ example: 1 }),
    lines: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.number().int().positive().openapi({ example: 12 }),
        quantity: zod_1.z.number().int().positive().max(99999).openapi({ example: 3 }),
    }))
        .min(1),
});
exports.catalogChatBody = zod_1.z.object({
    distributorId: zod_1.z.number().int().positive().openapi({ example: 1 }),
    messages: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(['user', 'assistant']),
        content: zod_1.z.string().min(1).max(8000),
    }))
        .min(1)
        .max(32),
});
function registerRetailerOpenApiSchemas(registry) {
    registry.register('RetailerDistributorIdQuery', exports.distributorIdQuery);
    registry.register('RetailerCartItemBody', exports.cartItemBody);
    registry.register('RetailerProductIdParams', exports.productIdParams);
    registry.register('RetailerOrdersListQuery', exports.ordersListQuery);
    registry.register('RetailerNlCartPreviewBody', exports.nlCartPreviewBody);
    registry.register('RetailerNlCartApplyBody', exports.nlCartApplyBody);
    registry.register('RetailerCatalogChatBody', exports.catalogChatBody);
    registry.register('RetailerCheckoutBody', exports.checkoutBody);
}
