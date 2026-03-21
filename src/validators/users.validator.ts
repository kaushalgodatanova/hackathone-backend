import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { appRoles, loginBody, registerBody } from './auth.validator';

extendZodWithOpenApi(z);

export const userPublicSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  role: appRoles,
  name: z.string().openapi({ example: 'Jane Distributor' }),
  defaultDeliverySiteId: z.number().int().positive().nullable().optional(),
  depotSiteId: z.number().int().positive().nullable().optional(),
  partnerCapacityKg: z.number().nullable().optional(),
  vehicleLabel: z.string().nullable().optional(),
});

export const patchMeProfileBody = z.object({
  defaultDeliverySiteId: z.number().int().positive().nullable().optional(),
  depotSiteId: z.number().int().positive().nullable().optional(),
  partnerCapacityKg: z.number().positive().max(99_999).nullable().optional(),
  vehicleLabel: z.string().max(128).nullable().optional(),
});

export type PatchMeProfileBody = z.infer<typeof patchMeProfileBody>;

export const authTokenResponse = z.object({
  accessToken: z.string().openapi({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT for Authorization: Bearer',
  }),
  user: userPublicSchema,
});

export const meResponse = z.object({
  user: userPublicSchema,
});

export const messageErrorResponse = z.object({
  message: z.string(),
});

export const healthResponse = z.object({
  message: z.string().openapi({ example: 'OK' }),
});

export function registerAuthOpenApiSchemas(registry: OpenAPIRegistry): void {
  registry.register('RegisterBody', registerBody);
  registry.register('LoginBody', loginBody);
  registry.register('UserPublic', userPublicSchema);
  registry.register('PatchMeProfileBody', patchMeProfileBody);
  registry.register('AuthTokenResponse', authTokenResponse);
  registry.register('MeResponse', meResponse);
  registry.register('MessageErrorResponse', messageErrorResponse);
  registry.register('HealthResponse', healthResponse);
}
