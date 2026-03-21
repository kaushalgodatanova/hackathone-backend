import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const productIdParams = z.object({
  id: z.coerce.number().int().positive().openapi({ example: 1, description: 'Product id' }),
});

export const createProductBody = z.object({
  name: z.string().min(1).max(255).openapi({ example: 'Whole milk 1L' }),
  sku: z.string().min(1).max(128).openapi({ example: 'MILK-1L' }),
  weightKg: z.number().positive().openapi({ example: 1.03, description: 'Kilograms per unit' }),
  quantityOnHand: z.number().int().min(0).default(0).openapi({ example: 100 }),
  unitPrice: z.number().nonnegative().openapi({ example: 2.5 }),
  isActive: z.boolean().optional().default(true),
});

export const updateProductBody = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(128).optional(),
  weightKg: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const decimalish = z.union([z.string(), z.number()]);

/** API shape (decimals serialized as strings). */
export const productResponseSchema = z.object({
  id: z.number().int(),
  distributorId: z.number().int(),
  name: z.string(),
  sku: z.string(),
  weightKg: decimalish,
  quantityOnHand: z.number().int(),
  unitPrice: decimalish,
  isActive: z.boolean(),
});

export const productListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(productResponseSchema),
});

export const productSingleResponseSchema = z.object({
  success: z.literal(true),
  data: productResponseSchema,
});

export const productDeletedResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const stockMovementsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50).openapi({ example: 50 }),
  offset: z.coerce.number().int().min(0).optional().default(0).openapi({ example: 0 }),
});

export const stockMovementRowSchema = z.object({
  id: z.number().int(),
  productId: z.number().int(),
  createdAt: z.union([z.string(), z.date()]),
  changeKind: z.enum(['add', 'remove', 'set']),
  delta: z.number().int(),
  quantityAfter: z.number().int(),
  actorUserId: z.number().int().nullable(),
  note: z.string().nullable(),
});

export type StockMovementJson = z.infer<typeof stockMovementRowSchema>;

export const stockMovementsListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stockMovementRowSchema),
  meta: z.object({
    limit: z.number().int(),
    offset: z.number().int(),
  }),
});

export function registerProductOpenApiSchemas(registry: OpenAPIRegistry): void {
  registry.register('ProductIdParams', productIdParams);
  registry.register('CreateProductBody', createProductBody);
  registry.register('UpdateProductBody', updateProductBody);
  registry.register('ProductResponse', productResponseSchema);
  registry.register('ProductListResponse', productListResponseSchema);
  registry.register('ProductSingleResponse', productSingleResponseSchema);
  registry.register('ProductDeletedResponse', productDeletedResponseSchema);
  registry.register('StockMovementsQuery', stockMovementsQuery);
  registry.register('StockMovementRow', stockMovementRowSchema);
  registry.register('StockMovementsListResponse', stockMovementsListResponseSchema);
}
