"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginBody = exports.registerBody = exports.appRoles = void 0;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const zod_1 = require("zod");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.appRoles = zod_1.z.enum(['distributor', 'retailer', 'delivery_partner']);
exports.registerBody = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email').openapi({ example: 'user@example.com' }),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters').openapi({ example: 'password123' }),
    role: exports.appRoles.openapi({ example: 'distributor' }),
    name: zod_1.z.string().min(1, 'Name is required').max(255).openapi({ example: 'Jane Distributor' }),
});
exports.loginBody = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email').openapi({ example: 'user@example.com' }),
    password: zod_1.z.string().min(1, 'Password is required').openapi({ example: 'password123' }),
});
