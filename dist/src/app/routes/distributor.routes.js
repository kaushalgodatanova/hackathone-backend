"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributorRegistry = void 0;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const express_1 = require("express");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const requireDistributor_1 = require("../../middlewares/requireDistributor");
const validate_1 = require("../../middlewares/validate");
const users_validator_1 = require("../../validators/users.validator");
const retailer_validator_1 = require("../../validators/retailer.validator");
const distributor_controller_1 = require("../controllers/distributor.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.use(requireDistributor_1.requireDistributor);
router.get('/orders/stats', distributor_controller_1.DistributorController.orderStats);
router.get('/orders', (0, validate_1.validate)({ query: retailer_validator_1.ordersListQuery }), distributor_controller_1.DistributorController.listOrders);
exports.distributorRegistry = new zod_to_openapi_1.OpenAPIRegistry();
const bearer = [{ bearerAuth: [] }];
exports.distributorRegistry.registerPath({
    method: 'get',
    path: '/distributor/orders/stats',
    summary: 'Order counts for this distributor',
    tags: ['Distributor'],
    security: bearer,
    responses: {
        200: { description: 'OK' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.distributorRegistry.registerPath({
    method: 'get',
    path: '/distributor/orders',
    summary: 'Retailer orders for this distributor',
    tags: ['Distributor'],
    security: bearer,
    request: { query: retailer_validator_1.ordersListQuery },
    responses: {
        200: { description: 'OK' },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
        403: { description: 'Not a distributor', content: { 'application/json': { schema: users_validator_1.messageErrorResponse } } },
    },
});
exports.default = router;
