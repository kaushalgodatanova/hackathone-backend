import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { loginBody, registerBody } from '../../validators/auth.validator';
import {
  authTokenResponse,
  meResponse,
  messageErrorResponse,
  patchMeProfileBody,
} from '../../validators/users.validator';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

router.post('/auth/register', validate({ body: registerBody }), AuthController.register);
router.post('/auth/login', validate({ body: loginBody }), AuthController.login);
router.get('/me', authMiddleware, AuthController.me);
router.patch('/me/profile', authMiddleware, validate({ body: patchMeProfileBody }), AuthController.patchProfile);

export const authRegistry = new OpenAPIRegistry();

authRegistry.registerPath({
  method: 'post',
  path: '/auth/register',
  summary: 'Register (returns JWT + user)',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: registerBody,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Account created',
      content: { 'application/json': { schema: authTokenResponse } },
    },
    409: {
      description: 'Email already in use',
      content: { 'application/json': { schema: messageErrorResponse } },
    },
  },
});

authRegistry.registerPath({
  method: 'post',
  path: '/auth/login',
  summary: 'Log in (returns JWT + user)',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Authenticated',
      content: { 'application/json': { schema: authTokenResponse } },
    },
    401: {
      description: 'Invalid credentials',
      content: { 'application/json': { schema: messageErrorResponse } },
    },
  },
});

authRegistry.registerPath({
  method: 'get',
  path: '/me',
  summary: 'Current user (Bearer JWT)',
  tags: ['Auth'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Current session',
      content: { 'application/json': { schema: meResponse } },
    },
    401: {
      description: 'Missing or invalid token',
      content: { 'application/json': { schema: messageErrorResponse } },
    },
  },
});

export default router;
