"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthResponse = exports.messageErrorResponse = exports.meResponse = exports.authTokenResponse = exports.patchMeProfileBody = exports.userPublicSchema = void 0;
exports.registerAuthOpenApiSchemas = registerAuthOpenApiSchemas;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const zod_1 = require("zod");
const auth_validator_1 = require("./auth.validator");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.userPublicSchema = zod_1.z.object({
    id: zod_1.z.number().int().openapi({ example: 1 }),
    email: zod_1.z.string().email().openapi({ example: 'user@example.com' }),
    role: auth_validator_1.appRoles,
    name: zod_1.z.string().openapi({ example: 'Jane Distributor' }),
    defaultDeliverySiteId: zod_1.z.number().int().positive().nullable().optional(),
    depotSiteId: zod_1.z.number().int().positive().nullable().optional(),
    partnerCapacityKg: zod_1.z.number().nullable().optional(),
    vehicleLabel: zod_1.z.string().nullable().optional(),
});
exports.patchMeProfileBody = zod_1.z.object({
    defaultDeliverySiteId: zod_1.z.number().int().positive().nullable().optional(),
    depotSiteId: zod_1.z.number().int().positive().nullable().optional(),
    partnerCapacityKg: zod_1.z.number().positive().max(99999).nullable().optional(),
    vehicleLabel: zod_1.z.string().max(128).nullable().optional(),
});
exports.authTokenResponse = zod_1.z.object({
    accessToken: zod_1.z.string().openapi({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT for Authorization: Bearer',
    }),
    user: exports.userPublicSchema,
});
exports.meResponse = zod_1.z.object({
    user: exports.userPublicSchema,
});
exports.messageErrorResponse = zod_1.z.object({
    message: zod_1.z.string(),
});
exports.healthResponse = zod_1.z.object({
    message: zod_1.z.string().openapi({ example: 'OK' }),
});
function registerAuthOpenApiSchemas(registry) {
    registry.register('RegisterBody', auth_validator_1.registerBody);
    registry.register('LoginBody', auth_validator_1.loginBody);
    registry.register('UserPublic', exports.userPublicSchema);
    registry.register('PatchMeProfileBody', exports.patchMeProfileBody);
    registry.register('AuthTokenResponse', exports.authTokenResponse);
    registry.register('MeResponse', exports.meResponse);
    registry.register('MessageErrorResponse', exports.messageErrorResponse);
    registry.register('HealthResponse', exports.healthResponse);
}
