"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retailerRegistry = void 0;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const express_1 = require("express");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const requireRetailer_1 = require("../../middlewares/requireRetailer");
const validate_1 = require("../../middlewares/validate");
const users_validator_1 = require("../../validators/users.validator");
const retailer_validator_1 = require("../../validators/retailer.validator");
const retailer_controller_1 = require("../controllers/retailer.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.use(requireRetailer_1.requireRetailer);
router.get('/distributors', retailer_controller_1.RetailerController.listDistributors);
router.post('/catalog/chat', (0, validate_1.validate)({ body: retailer_validator_1.catalogChatBody }), retailer_controller_1.RetailerController.catalogChat);
router.get('/catalog', (0, validate_1.validate)({ query: retailer_validator_1.distributorIdQuery }), retailer_controller_1.RetailerController.catalog);
router.get('/cart', retailer_controller_1.RetailerController.getCart);
router.post('/cart/nl-preview', (0, validate_1.validate)({ body: retailer_validator_1.nlCartPreviewBody }), retailer_controller_1.RetailerController.nlCartPreview);
router.post('/cart/nl-apply', (0, validate_1.validate)({ body: retailer_validator_1.nlCartApplyBody }), retailer_controller_1.RetailerController.nlCartApply);
router.put('/cart/items', (0, validate_1.validate)({ body: retailer_validator_1.cartItemBody }), retailer_controller_1.RetailerController.upsertCartItem);
router.delete('/cart/items/:productId', (0, validate_1.validate)({ params: retailer_validator_1.productIdParams }), retailer_controller_1.RetailerController.removeCartItem);
router.delete('/cart', retailer_controller_1.RetailerController.clearCart);
router.post('/checkout', (0, validate_1.validate)({ body: retailer_validator_1.checkoutBody }), retailer_controller_1.RetailerController.checkout);
router.get('/orders', (0, validate_1.validate)({ query: retailer_validator_1.ordersListQuery }), retailer_controller_1.RetailerController.listOrders);
exports.retailerRegistry = new zod_to_openapi_1.OpenAPIRegistry();
(0, retailer_validator_1.registerRetailerOpenApiSchemas)(exports.retailerRegistry);
const bearer = [{ bearerAuth: [] }];
exports.retailerRegistry.registerPath({
    method: 'get',
    path: '/retailer/distributors',
    summary: 'List distributors (retailer)',
    tags: ['Retailer'],
    security: bearer,
    responses: {
        200: { description: 'OK' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'get',
    path: '/retailer/catalog',
    summary: 'Catalog for a distributor',
    tags: ['Retailer'],
    security: bearer,
    request: { query: retailer_validator_1.distributorIdQuery },
    responses: {
        200: { description: 'OK' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'post',
    path: '/retailer/catalog/chat',
    summary: 'Catalog Q&A and optional order preview (OpenAI)',
    tags: ['Retailer'],
    security: bearer,
    request: { body: { content: { 'application/json': { schema: retailer_validator_1.catalogChatBody } } } },
    responses: {
        200: { description: 'OK' },
        400: { description: 'Validation', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        503: { description: 'OpenAI not configured', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'get',
    path: '/retailer/cart',
    summary: 'Current cart',
    tags: ['Retailer'],
    security: bearer,
    responses: {
        200: { description: 'OK' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'put',
    path: '/retailer/cart/items',
    summary: 'Add or update cart line (quantity 0 removes)',
    tags: ['Retailer'],
    security: bearer,
    request: { body: { content: { 'application/json': { schema: retailer_validator_1.cartItemBody } } } },
    responses: {
        200: { description: 'OK with updated cart' },
        400: { description: 'Validation or stock', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Product not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'delete',
    path: '/retailer/cart/items/{productId}',
    summary: 'Remove one cart line',
    tags: ['Retailer'],
    security: bearer,
    request: { params: retailer_validator_1.productIdParams },
    responses: {
        200: { description: 'OK with updated cart' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'delete',
    path: '/retailer/cart',
    summary: 'Clear cart',
    tags: ['Retailer'],
    security: bearer,
    responses: {
        200: { description: 'OK' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'post',
    path: '/retailer/checkout',
    summary: 'Place orders (one per distributor); clears cart',
    tags: ['Retailer'],
    security: bearer,
    responses: {
        201: { description: 'Created' },
        400: {
            description: 'Empty cart or invalid lines',
            content: { 'application/json': { schema: users_validator_1.messageErrorResponse } },
        },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        409: { description: 'Stock race', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'get',
    path: '/retailer/orders',
    summary: 'Order history',
    tags: ['Retailer'],
    security: bearer,
    request: { query: retailer_validator_1.ordersListQuery },
    responses: {
        200: { description: 'OK' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'post',
    path: '/retailer/cart/nl-preview',
    summary: 'Natural language order preview (OpenAI + catalog match)',
    tags: ['Retailer'],
    security: bearer,
    request: { body: { content: { 'application/json': { schema: retailer_validator_1.nlCartPreviewBody } } } },
    responses: {
        200: { description: 'OK' },
        400: { description: 'Validation', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        503: { description: 'OpenAI not configured', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.retailerRegistry.registerPath({
    method: 'post',
    path: '/retailer/cart/nl-apply',
    summary: 'Apply NL preview lines to cart (merge quantities)',
    tags: ['Retailer'],
    security: bearer,
    request: { body: { content: { 'application/json': { schema: retailer_validator_1.nlCartApplyBody } } } },
    responses: {
        200: { description: 'OK with updated cart' },
        400: { description: 'Validation or stock', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a retailer', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.default = router;
