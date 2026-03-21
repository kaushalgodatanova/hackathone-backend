// docs/openapi.ts
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { authRegistry } from '../app/routes/auth.routes';
import { distributorRegistry } from '../app/routes/distributor.routes';
import { productRegistry } from '../app/routes/product.routes';
import { retailerRegistry } from '../app/routes/retailer.routes';
import { healthResponse, registerAuthOpenApiSchemas } from '../validators/users.validator';

const rootRegistry = new OpenAPIRegistry([productRegistry, authRegistry, retailerRegistry, distributorRegistry]);

registerAuthOpenApiSchemas(rootRegistry);

rootRegistry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Health check',
  tags: ['System'],
  responses: {
    200: {
      description: 'API is up',
      content: { 'application/json': { schema: healthResponse } },
    },
  },
});

rootRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    'JWT from POST /auth/login or /auth/register. Header: Authorization: Bearer followed by the token string.',
});

const generator = new OpenApiGeneratorV3(rootRegistry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'B2B Delivery IQ API',
    version: '1.0.0',
    description:
      'Express API — auth (JWT), batch windows, delivery sites, driver runs, distributor products/stock/orders, retailer catalog/cart/orders. Swagger UI: `/api/docs`.',
  },
  servers: [{ url: '/api', description: 'API base (same host as this server)' }],
  tags: [
    { name: 'Auth', description: 'Register, login, session, profile' },
    { name: 'Products', description: 'Distributor catalog and stock (Bearer JWT, role=distributor)' },
    { name: 'Retailer', description: 'Catalog, cart, checkout, orders (Bearer JWT, role=retailer)' },
    { name: 'Distributor', description: 'Retailer orders for your business (Bearer JWT, role=distributor)' },
    { name: 'Delivery', description: 'Static delivery sites (public list)' },
    { name: 'Batch', description: 'Current batch window (countdown / IST display)' },
    { name: 'Driver', description: 'Delivery partner runs (Bearer JWT, role=delivery_partner)' },
    { name: 'System', description: 'Health' },
  ],
});
