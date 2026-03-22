"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console -- CLI seed script */
/**
 * Bulk-insert demo products for every distributor account.
 *
 * - Removes only rows whose SKU starts with DEMO- (safe re-run).
 * - Requires DATABASE_URL and at least one user with role=distributor.
 *
 * Usage: npm run seed:mock-products
 */
require("dotenv/config");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../database/db");
const products_1 = require("../database/schema/products");
const users_1 = require("../database/schema/users");
const mock_product_catalog_1 = require("./mock-product-catalog");
async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set. Load .env or export DATABASE_URL.');
        process.exit(1);
    }
    const distributors = await db_1.db
        .select({ id: users_1.usersTable.id, name: users_1.usersTable.name })
        .from(users_1.usersTable)
        .where((0, drizzle_orm_1.eq)(users_1.usersTable.role, 'distributor'));
    if (distributors.length === 0) {
        console.error('No distributor users found. Register at least one distributor first.');
        process.exit(1);
    }
    await db_1.db.delete(products_1.productsTable).where((0, drizzle_orm_1.like)(products_1.productsTable.sku, 'DEMO-%'));
    console.log('Removed existing DEMO-* products (if any).');
    let inserted = 0;
    for (const d of distributors) {
        const rows = mock_product_catalog_1.MOCK_PRODUCT_CATALOG.map((p) => ({
            distributorId: d.id,
            name: p.name,
            sku: p.sku,
            weightKg: p.weightKg,
            quantityOnHand: p.quantityOnHand,
            unitPrice: p.unitPrice,
            category: p.category,
            isActive: true,
        }));
        await db_1.db.insert(products_1.productsTable).values(rows);
        inserted += rows.length;
        console.log(`  ${d.name} (id=${d.id}): +${rows.length} products`);
    }
    console.log(`\nDone. Inserted ${inserted} product rows across ${distributors.length} distributor(s).`);
    console.log(`Catalog: ${mock_product_catalog_1.MOCK_PRODUCT_CATALOG.length} unique SKUs × ${distributors.length} distributors.`);
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
