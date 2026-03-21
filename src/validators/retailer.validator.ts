import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const distributorIdQuery = z.object({
  distributorId: z.coerce.number().int().positive().openapi({ example: 1 }),
});

export const cartItemBody = z.object({
  productId: z.number().int().positive().openapi({ example: 1 }),
  quantity: z.number().int().min(0).openapi({ example: 3, description: '0 removes the line' }),
});

export const productIdParams = z.object({
  productId: z.coerce.number().int().positive().openapi({ example: 1 }),
});

export const ordersListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const checkoutBody = z.object({
  deliverySiteId: z.number().int().positive().optional().openapi({
    description: 'Override snapshot site; otherwise profile default_delivery_site_id is used.',
  }),
});

export const nlCartPreviewBody = z.object({
  distributorId: z.number().int().positive().openapi({ example: 1 }),
  message: z.string().min(1).max(8000).openapi({ example: '10 cases of water and 5 apple crates' }),
});

export const nlCartApplyBody = z.object({
  distributorId: z.number().int().positive().openapi({ example: 1 }),
  lines: z
    .array(
      z.object({
        productId: z.number().int().positive().openapi({ example: 12 }),
        quantity: z.number().int().positive().max(99_999).openapi({ example: 3 }),
      }),
    )
    .min(1),
});

export const catalogChatBody = z.object({
  distributorId: z.number().int().positive().openapi({ example: 1 }),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(32),
});

export function registerRetailerOpenApiSchemas(registry: OpenAPIRegistry): void {
  registry.register('RetailerDistributorIdQuery', distributorIdQuery);
  registry.register('RetailerCartItemBody', cartItemBody);
  registry.register('RetailerProductIdParams', productIdParams);
  registry.register('RetailerOrdersListQuery', ordersListQuery);
  registry.register('RetailerNlCartPreviewBody', nlCartPreviewBody);
  registry.register('RetailerNlCartApplyBody', nlCartApplyBody);
  registry.register('RetailerCatalogChatBody', catalogChatBody);
  registry.register('RetailerCheckoutBody', checkoutBody);
}
