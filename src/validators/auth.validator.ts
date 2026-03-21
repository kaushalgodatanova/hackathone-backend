import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const appRoles = z.enum(['distributor', 'retailer', 'delivery_partner']);

export const registerBody = z.object({
  email: z.string().email('Invalid email').openapi({ example: 'user@example.com' }),
  password: z.string().min(8, 'Password must be at least 8 characters').openapi({ example: 'password123' }),
  role: appRoles.openapi({ example: 'distributor' }),
  name: z.string().min(1, 'Name is required').max(255).openapi({ example: 'Jane Distributor' }),
});

export const loginBody = z.object({
  email: z.string().email('Invalid email').openapi({ example: 'user@example.com' }),
  password: z.string().min(1, 'Password is required').openapi({ example: 'password123' }),
});

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
