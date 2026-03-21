import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';

import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireRetailer } from '../../middlewares/requireRetailer';
import { validate } from '../../middlewares/validate';
import { messageErrorResponse } from '../../validators/users.validator';
import {
  cartItemBody,
  catalogChatBody,
  checkoutBody,
  distributorIdQuery,
  nlCartApplyBody,
  nlCartPreviewBody,
  ordersListQuery,
  productIdParams,
  registerRetailerOpenApiSchemas,
} from '../../validators/retailer.validator';
import { RetailerController } from '../controllers/retailer.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRetailer);

router.get('/distributors', RetailerController.listDistributors);
router.post('/catalog/chat', validate({ body: catalogChatBody }), RetailerController.catalogChat);
router.get('/catalog', validate({ query: distributorIdQuery }), RetailerController.catalog);
router.get('/cart', RetailerController.getCart);
router.post('/cart/nl-preview', validate({ body: nlCartPreviewBody }), RetailerController.nlCartPreview);
router.post('/cart/nl-apply', validate({ body: nlCartApplyBody }), RetailerController.nlCartApply);
router.put('/cart/items', validate({ body: cartItemBody }), RetailerController.upsertCartItem);
router.delete('/cart/items/:productId', validate({ params: productIdParams }), RetailerController.removeCartItem);
router.delete('/cart', RetailerController.clearCart);
router.post('/checkout', validate({ body: checkoutBody }), RetailerController.checkout);
router.get('/orders', validate({ query: ordersListQuery }), RetailerController.listOrders);

export const retailerRegistry = new OpenAPIRegistry();
registerRetailerOpenApiSchemas(retailerRegistry);

const bearer: { bearerAuth: never[] }[] = [{ bearerAuth: [] }];

retailerRegistry.registerPath({
  method: 'get',
  path: '/retailer/distributors',
  summary: 'List distributors (retailer)',
  tags: ['Retailer'],
  security: bearer,
  responses: {
    200: { description: 'OK' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'get',
  path: '/retailer/catalog',
  summary: 'Catalog for a distributor',
  tags: ['Retailer'],
  security: bearer,
  request: { query: distributorIdQuery },
  responses: {
    200: { description: 'OK' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'post',
  path: '/retailer/catalog/chat',
  summary: 'Catalog Q&A and optional order preview (OpenAI)',
  tags: ['Retailer'],
  security: bearer,
  request: { body: { content: { 'application/json': { schema: catalogChatBody } } } },
  responses: {
    200: { description: 'OK' },
    400: { description: 'Validation', content: { 'application/json': { schema: messageErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
    503: { description: 'OpenAI not configured', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'get',
  path: '/retailer/cart',
  summary: 'Current cart',
  tags: ['Retailer'],
  security: bearer,
  responses: {
    200: { description: 'OK' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'put',
  path: '/retailer/cart/items',
  summary: 'Add or update cart line (quantity 0 removes)',
  tags: ['Retailer'],
  security: bearer,
  request: { body: { content: { 'application/json': { schema: cartItemBody } } } },
  responses: {
    200: { description: 'OK with updated cart' },
    400: { description: 'Validation or stock', content: { 'application/json': { schema: messageErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Product not found', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'delete',
  path: '/retailer/cart/items/{productId}',
  summary: 'Remove one cart line',
  tags: ['Retailer'],
  security: bearer,
  request: { params: productIdParams },
  responses: {
    200: { description: 'OK with updated cart' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'delete',
  path: '/retailer/cart',
  summary: 'Clear cart',
  tags: ['Retailer'],
  security: bearer,
  responses: {
    200: { description: 'OK' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'post',
  path: '/retailer/checkout',
  summary: 'Place orders (one per distributor); clears cart',
  tags: ['Retailer'],
  security: bearer,
  responses: {
    201: { description: 'Created' },
    400: {
      description: 'Empty cart or invalid lines',
      content: { 'application/json': { schema: messageErrorResponse } },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
    409: { description: 'Stock race', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'get',
  path: '/retailer/orders',
  summary: 'Order history',
  tags: ['Retailer'],
  security: bearer,
  request: { query: ordersListQuery },
  responses: {
    200: { description: 'OK' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'post',
  path: '/retailer/cart/nl-preview',
  summary: 'Natural language order preview (OpenAI + catalog match)',
  tags: ['Retailer'],
  security: bearer,
  request: { body: { content: { 'application/json': { schema: nlCartPreviewBody } } } },
  responses: {
    200: { description: 'OK' },
    400: { description: 'Validation', content: { 'application/json': { schema: messageErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
    503: { description: 'OpenAI not configured', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

retailerRegistry.registerPath({
  method: 'post',
  path: '/retailer/cart/nl-apply',
  summary: 'Apply NL preview lines to cart (merge quantities)',
  tags: ['Retailer'],
  security: bearer,
  request: { body: { content: { 'application/json': { schema: nlCartApplyBody } } } },
  responses: {
    200: { description: 'OK with updated cart' },
    400: { description: 'Validation or stock', content: { 'application/json': { schema: messageErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a retailer', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

export default router;
