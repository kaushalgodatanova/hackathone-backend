/* eslint-disable no-console -- CLI seed script */
/**
 * Bulk-insert demo products for every distributor account.
 *
 * - Removes only rows whose SKU starts with DEMO- (safe re-run).
 * - Requires DATABASE_URL and at least one user with role=distributor.
 *
 * Usage: npm run seed:mock-products
 */
import 'dotenv/config';

import { eq, like } from 'drizzle-orm';

import { db } from '../database/db';
import { productsTable } from '../database/schema/products';
import { usersTable } from '../database/schema/users';
import { MOCK_PRODUCT_CATALOG } from './mock-product-catalog';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Load .env or export DATABASE_URL.');
    process.exit(1);
  }

  const distributors = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.role, 'distributor'));

  if (distributors.length === 0) {
    console.error('No distributor users found. Register at least one distributor first.');
    process.exit(1);
  }

  await db.delete(productsTable).where(like(productsTable.sku, 'DEMO-%'));
  console.log('Removed existing DEMO-* products (if any).');

  let inserted = 0;
  for (const d of distributors) {
    const rows = MOCK_PRODUCT_CATALOG.map((p) => ({
      distributorId: d.id,
      name: p.name,
      sku: p.sku,
      weightKg: p.weightKg,
      quantityOnHand: p.quantityOnHand,
      unitPrice: p.unitPrice,
      category: p.category,
      isActive: true,
    }));

    await db.insert(productsTable).values(rows);
    inserted += rows.length;
    console.log(`  ${d.name} (id=${d.id}): +${rows.length} products`);
  }

  console.log(`\nDone. Inserted ${inserted} product rows across ${distributors.length} distributor(s).`);
  console.log(`Catalog: ${MOCK_PRODUCT_CATALOG.length} unique SKUs × ${distributors.length} distributors.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
