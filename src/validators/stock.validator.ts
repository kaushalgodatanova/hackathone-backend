import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { productResponseSchema, stockMovementRowSchema } from './product.validator';

extendZodWithOpenApi(z);

export const stockAddBody = z.object({
  amount: z.number().int().positive().openapi({ example: 10, description: 'Units to add' }),
  note: z.string().max(512).optional(),
});

export const stockRemoveBody = z.object({
  amount: z.number().int().positive().openapi({ example: 5, description: 'Units to remove' }),
  note: z.string().max(512).optional(),
});

export const stockSetBody = z.object({
  quantity: z.number().int().min(0).openapi({ example: 42, description: 'Absolute on-hand quantity' }),
  note: z.string().max(512).optional(),
});

export const stockAdjustResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    product: productResponseSchema,
    movement: stockMovementRowSchema,
  }),
});

export function registerStockOpenApiSchemas(registry: OpenAPIRegistry): void {
  registry.register('StockAddBody', stockAddBody);
  registry.register('StockRemoveBody', stockRemoveBody);
  registry.register('StockSetBody', stockSetBody);
  registry.register('StockAdjustResponse', stockAdjustResponseSchema);
}
