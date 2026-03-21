import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';

import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireDistributor } from '../../middlewares/requireDistributor';
import { validate } from '../../middlewares/validate';
import { messageErrorResponse } from '../../validators/users.validator';
import { ordersListQuery } from '../../validators/retailer.validator';
import { DistributorController } from '../controllers/distributor.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireDistributor);

router.get('/orders/stats', DistributorController.orderStats);
router.get('/orders', validate({ query: ordersListQuery }), DistributorController.listOrders);

export const distributorRegistry = new OpenAPIRegistry();

const bearer: { bearerAuth: never[] }[] = [{ bearerAuth: [] }];

distributorRegistry.registerPath({
  method: 'get',
  path: '/distributor/orders/stats',
  summary: 'Order counts for this distributor',
  tags: ['Distributor'],
  security: bearer,
  responses: {
    200: { description: 'OK' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

distributorRegistry.registerPath({
  method: 'get',
  path: '/distributor/orders',
  summary: 'Retailer orders for this distributor',
  tags: ['Distributor'],
  security: bearer,
  request: { query: ordersListQuery },
  responses: {
    200: { description: 'OK' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: messageErrorResponse } } },
    403: { description: 'Not a distributor', content: { 'application/json': { schema: messageErrorResponse } } },
  },
});

export default router;
