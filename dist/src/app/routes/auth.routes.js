"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRegistry = void 0;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const express_1 = require("express");
const validate_1 = require("../../middlewares/validate");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const auth_validator_1 = require("../../validators/auth.validator");
const users_validator_1 = require("../../validators/users.validator");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post('/auth/register', (0, validate_1.validate)({ body: auth_validator_1.registerBody }), auth_controller_1.AuthController.register);
router.post('/auth/login', (0, validate_1.validate)({ body: auth_validator_1.loginBody }), auth_controller_1.AuthController.login);
router.get('/me', authMiddleware_1.authMiddleware, auth_controller_1.AuthController.me);
router.patch('/me/profile', authMiddleware_1.authMiddleware, (0, validate_1.validate)({ body: users_validator_1.patchMeProfileBody }), auth_controller_1.AuthController.patchProfile);
exports.authRegistry = new zod_to_openapi_1.OpenAPIRegistry();
exports.authRegistry.registerPath({
    method: 'post',
    path: '/auth/register',
    summary: 'Register (returns JWT + user)',
    tags: ['Auth'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: auth_validator_1.registerBody,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Account created',
            content: { 'application/json': { schema: users_validator_1.authTokenResponse } },
        },
        409: {
            description: 'Email already in use',
            content: { 'application/json': { schema: users_validator_1.messageErrorResponse } },
        },
    },
});
exports.authRegistry.registerPath({
    method: 'post',
    path: '/auth/login',
    summary: 'Log in (returns JWT + user)',
    tags: ['Auth'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: auth_validator_1.loginBody,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Authenticated',
            content: { 'application/json': { schema: users_validator_1.authTokenResponse } },
        },
        401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: users_validator_1.messageErrorResponse } },
        },
    },
});
exports.authRegistry.registerPath({
    method: 'get',
    path: '/me',
    summary: 'Current user (Bearer JWT)',
    tags: ['Auth'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Current session',
            content: { 'application/json': { schema: users_validator_1.meResponse } },
        },
        401: {
            description: 'Missing or invalid token',
            content: { 'application/json': { schema: users_validator_1.messageErrorResponse } },
        },
    },
});
exports.default = router;
