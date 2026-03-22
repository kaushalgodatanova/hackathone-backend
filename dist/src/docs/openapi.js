"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiDocument = void 0;
// docs/openapi.ts
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const auth_routes_1 = require("../app/routes/auth.routes");
const distributor_routes_1 = require("../app/routes/distributor.routes");
const product_routes_1 = require("../app/routes/product.routes");
const retailer_routes_1 = require("../app/routes/retailer.routes");
const users_validator_1 = require("../validators/users.validator");
const rootRegistry = new zod_to_openapi_1.OpenAPIRegistry([product_routes_1.productRegistry, auth_routes_1.authRegistry, retailer_routes_1.retailerRegistry, distributor_routes_1.distributorRegistry]);
(0, users_validator_1.registerAuthOpenApiSchemas)(rootRegistry);
rootRegistry.registerPath({
    method: 'get',
    path: '/health',
    summary: 'Health check',
    tags: ['System'],
    responses: {
        200: {
            description: 'API is up',
            content: { 'application/json': { schema: users_validator_1.healthResponse } },
        },
    },
});
rootRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT from POST /auth/login or /auth/register. Header: Authorization: Bearer followed by the token string.',
});
const generator = new zod_to_openapi_1.OpenApiGeneratorV3(rootRegistry.definitions);
exports.openApiDocument = generator.generateDocument({
    openapi: '3.0.0',
    info: {
        title: 'B2B Delivery IQ API',
        version: '1.0.0',
        description: 'Express API — auth (JWT), batch windows, delivery sites, driver runs, distributor products/stock/orders, retailer catalog/cart/orders. Swagger UI: `/api/docs`.',
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
