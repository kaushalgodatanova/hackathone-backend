import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';

import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireDistributor } from '../../middlewares/requireDistributor';
import { validate } from '../../middlewares/validate';
import { messageErrorResponse } from '../../validators/users.validator';
import {
  createProductBody,
  productIdParams,
  productDeletedResponseSchema,
  productListResponseSchema,
  productSingleResponseSchema,
  registerProductOpenApiSchemas,
  stockMovementsQuery,
  stockMovementsListResponseSchema,
  updateProductBody,
} from '../../validators/product.validator';
import {
  registerStockOpenApiSchemas,
  stockAddBody,
  stockAdjustResponseSchema,
  stockRemoveBody,
  stockSetBody,
} from '../../validators/stock.validator';
import { ProductController } from '../controllers/product.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireDistributor);

router.get('/', ProductController.list);
router.post('/', validate({ body: createProductBody }), ProductController.create);
router.get('/:id', validate({ params: productIdParams }), ProductController.getById);
router.patch('/:id', validate({ params: productIdParams, body: updateProductBody }), ProductController.update);
router.delete('/:id', validate({ params: productIdParams }), ProductController.remove);

router.post('/:id/stock/add', validate({ params: productIdParams, body: stockAddBody }), ProductController.stockAdd);
router.post(
  '/:id/stock/remove',
  validate({ params: productIdParams, body: stockRemoveBody }),
  ProductController.stockRemove,
);
router.patch('/:id/stock', validate({ params: productIdParams, body: stockSetBody }), ProductController.stockSet);
router.get(
  '/:id/stock/movements',
  validate({ params: productIdParams, query: stockMovementsQuery }),
  ProductController.stockMovements,
);

export const productRegistry = new OpenAPIRegistry();

registerProductOpenApiSchemas(productRegistry);
registerStockOpenApiSchemas(productRegistry);

const bearer: { bearerAuth: never[] }[] = [{ bearerAuth: [] }];

productRegistry.registerPath({
  method: 'get',
  path: '/products',
  summary: 'List my products',
  tags: ['Products'],
  security: bearer,
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: productListResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'post',
  path: '/products',
  summary: 'Create product',
  tags: ['Products'],
  security: bearer,
  request: { body: { content: { 'application/json': { schema: createProductBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: productSingleResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    409: { description: 'Duplicate SKU', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'get',
  path: '/products/{id}',
  summary: 'Get product by id',
  tags: ['Products'],
  security: bearer,
  request: { params: productIdParams },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: productSingleResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Not found', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'patch',
  path: '/products/{id}',
  summary: 'Update product (catalog fields only; use stock endpoints for quantity)',
  tags: ['Products'],
  security: bearer,
  request: {
    params: productIdParams,
    body: { content: { 'application/json': { schema: updateProductBody } } },
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: productSingleResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Not found', content: { 'application/json': { schema: messageErrorResponse } } },
    409: { description: 'Duplicate SKU', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'delete',
  path: '/products/{id}',
  summary: 'Delete product (cascades stock history)',
  tags: ['Products'],
  security: bearer,
  request: { params: productIdParams },
  responses: {
    200: {
      description: 'Deleted',
      content: {
        'application/json': {
          schema: productDeletedResponseSchema,
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Not found', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'post',
  path: '/products/{id}/stock/add',
  summary: 'Add stock',
  tags: ['Products'],
  security: bearer,
  request: {
    params: productIdParams,
    body: { content: { 'application/json': { schema: stockAddBody } } },
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: stockAdjustResponseSchema } } },
    400: { description: 'Bad request', content: { 'application/json': { schema: messageErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Not found', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'post',
  path: '/products/{id}/stock/remove',
  summary: 'Remove stock',
  tags: ['Products'],
  security: bearer,
  request: {
    params: productIdParams,
    body: { content: { 'application/json': { schema: stockRemoveBody } } },
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: stockAdjustResponseSchema } } },
    400: { description: 'Insufficient stock', content: { 'application/json': { schema: messageErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Not found', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'patch',
  path: '/products/{id}/stock',
  summary: 'Set absolute stock quantity',
  tags: ['Products'],
  security: bearer,
  request: {
    params: productIdParams,
    body: { content: { 'application/json': { schema: stockSetBody } } },
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: stockAdjustResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Not found', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

productRegistry.registerPath({
  method: 'get',
  path: '/products/{id}/stock/movements',
  summary: 'Stock movement history',
  tags: ['Products'],
  security: bearer,
  request: { params: productIdParams, query: stockMovementsQuery },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: stockMovementsListResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
    404: { description: 'Not found', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

export default router;
