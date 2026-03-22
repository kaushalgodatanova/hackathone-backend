"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRegistry = void 0;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const express_1 = require("express");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const requireDistributor_1 = require("../../middlewares/requireDistributor");
const validate_1 = require("../../middlewares/validate");
const users_validator_1 = require("../../validators/users.validator");
const product_validator_1 = require("../../validators/product.validator");
const stock_validator_1 = require("../../validators/stock.validator");
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.use(requireDistributor_1.requireDistributor);
router.get('/', product_controller_1.ProductController.list);
router.post('/', (0, validate_1.validate)({ body: product_validator_1.createProductBody }), product_controller_1.ProductController.create);
router.get('/:id', (0, validate_1.validate)({ params: product_validator_1.productIdParams }), product_controller_1.ProductController.getById);
router.patch('/:id', (0, validate_1.validate)({ params: product_validator_1.productIdParams, body: product_validator_1.updateProductBody }), product_controller_1.ProductController.update);
router.delete('/:id', (0, validate_1.validate)({ params: product_validator_1.productIdParams }), product_controller_1.ProductController.remove);
router.post('/:id/stock/add', (0, validate_1.validate)({ params: product_validator_1.productIdParams, body: stock_validator_1.stockAddBody }), product_controller_1.ProductController.stockAdd);
router.post('/:id/stock/remove', (0, validate_1.validate)({ params: product_validator_1.productIdParams, body: stock_validator_1.stockRemoveBody }), product_controller_1.ProductController.stockRemove);
router.patch('/:id/stock', (0, validate_1.validate)({ params: product_validator_1.productIdParams, body: stock_validator_1.stockSetBody }), product_controller_1.ProductController.stockSet);
router.get('/:id/stock/movements', (0, validate_1.validate)({ params: product_validator_1.productIdParams, query: product_validator_1.stockMovementsQuery }), product_controller_1.ProductController.stockMovements);
exports.productRegistry = new zod_to_openapi_1.OpenAPIRegistry();
(0, product_validator_1.registerProductOpenApiSchemas)(exports.productRegistry);
(0, stock_validator_1.registerStockOpenApiSchemas)(exports.productRegistry);
const bearer = [{ bearerAuth: [] }];
exports.productRegistry.registerPath({
    method: 'get',
    path: '/products',
    summary: 'List my products',
    tags: ['Products'],
    security: bearer,
    responses: {
        200: { description: 'OK', content: { 'application/json': { schema: product_validator_1.productListResponseSchema } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'post',
    path: '/products',
    summary: 'Create product',
    tags: ['Products'],
    security: bearer,
    request: { body: { content: { 'application/json': { schema: product_validator_1.createProductBody } } } },
    responses: {
        201: { description: 'Created', content: { 'application/json': { schema: product_validator_1.productSingleResponseSchema } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        409: { description: 'Duplicate SKU', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'get',
    path: '/products/{id}',
    summary: 'Get product by id',
    tags: ['Products'],
    security: bearer,
    request: { params: product_validator_1.productIdParams },
    responses: {
        200: { description: 'OK', content: { 'application/json': { schema: product_validator_1.productSingleResponseSchema } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'patch',
    path: '/products/{id}',
    summary: 'Update product (catalog fields only; use stock endpoints for quantity)',
    tags: ['Products'],
    security: bearer,
    request: {
        params: product_validator_1.productIdParams,
        body: { content: { 'application/json': { schema: product_validator_1.updateProductBody } } },
    },
    responses: {
        200: { description: 'OK', content: { 'application/json': { schema: product_validator_1.productSingleResponseSchema } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        409: { description: 'Duplicate SKU', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'delete',
    path: '/products/{id}',
    summary: 'Delete product (cascades stock history)',
    tags: ['Products'],
    security: bearer,
    request: { params: product_validator_1.productIdParams },
    responses: {
        200: {
            description: 'Deleted',
            content: {
                'application/json': {
                    schema: product_validator_1.productDeletedResponseSchema,
                },
            },
        },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'post',
    path: '/products/{id}/stock/add',
    summary: 'Add stock',
    tags: ['Products'],
    security: bearer,
    request: {
        params: product_validator_1.productIdParams,
        body: { content: { 'application/json': { schema: stock_validator_1.stockAddBody } } },
    },
    responses: {
        200: { description: 'OK', content: { 'application/json': { schema: stock_validator_1.stockAdjustResponseSchema } } },
        400: { description: 'Bad request', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'post',
    path: '/products/{id}/stock/remove',
    summary: 'Remove stock',
    tags: ['Products'],
    security: bearer,
    request: {
        params: product_validator_1.productIdParams,
        body: { content: { 'application/json': { schema: stock_validator_1.stockRemoveBody } } },
    },
    responses: {
        200: { description: 'OK', content: { 'application/json': { schema: stock_validator_1.stockAdjustResponseSchema } } },
        400: { description: 'Insufficient stock', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'patch',
    path: '/products/{id}/stock',
    summary: 'Set absolute stock quantity',
    tags: ['Products'],
    security: bearer,
    request: {
        params: product_validator_1.productIdParams,
        body: { content: { 'application/json': { schema: stock_validator_1.stockSetBody } } },
    },
    responses: {
        200: { description: 'OK', content: { 'application/json': { schema: stock_validator_1.stockAdjustResponseSchema } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.productRegistry.registerPath({
    method: 'get',
    path: '/products/{id}/stock/movements',
    summary: 'Stock movement history',
    tags: ['Products'],
    security: bearer,
    request: { params: product_validator_1.productIdParams, query: product_validator_1.stockMovementsQuery },
    responses: {
        200: { description: 'OK', content: { 'application/json': { schema: product_validator_1.stockMovementsListResponseSchema } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        404: { description: 'Not found', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.default = router;
