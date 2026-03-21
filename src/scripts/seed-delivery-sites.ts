/**
 * Seeds `Delivery_sites` with Ahmedabad-area demo coordinates.
 * Run after migrations: `npx ts-node --files ./src/scripts/seed-delivery-sites.ts`
 */
import { eq } from 'drizzle-orm';

import { db } from '../database/db';
import { deliverySitesTable } from '../database/schema/delivery_sites';

const SITES: {
  label: string;
  lat: number;
  lon: number;
  city: string;
  area: string;
  isRetailDrop: boolean;
}[] = [
  { label: 'CG Road Hub', lat: 23.033, lon: 72.562, city: 'Ahmedabad', area: 'CG Road', isRetailDrop: true },
  { label: 'Satellite Depot', lat: 23.015, lon: 72.518, city: 'Ahmedabad', area: 'Satellite', isRetailDrop: true },
  { label: 'Maninagar Stop', lat: 22.997, lon: 72.618, city: 'Ahmedabad', area: 'Maninagar', isRetailDrop: true },
  { label: 'Gandhinagar DC', lat: 23.215, lon: 72.636, city: 'Gandhinagar', area: 'Sector 7', isRetailDrop: true },
  {
    label: 'Central Warehouse (depot)',
    lat: 23.06,
    lon: 72.58,
    city: 'Ahmedabad',
    area: 'Naroda',
    isRetailDrop: false,
  },
];

async function main(): Promise<void> {
  for (const s of SITES) {
    const [existing] = await db
      .select({ id: deliverySitesTable.id })
      .from(deliverySitesTable)
      .where(eq(deliverySitesTable.label, s.label))
      .limit(1);

    if (existing) {
      // eslint-disable-next-line no-console
      console.log('Skip (exists):', s.label);
      continue;
    }

    await db.insert(deliverySitesTable).values({
      label: s.label,
      latitude: String(s.lat),
      longitude: String(s.lon),
      city: s.city,
      area: s.area,
      isRetailDrop: s.isRetailDrop,
    });
    // eslint-disable-next-line no-console
    console.log('Inserted:', s.label);
  }
  // eslint-disable-next-line no-console
  console.log('Done. Register a delivery_partner and set DEFAULT_DELIVERY_PARTNER_ID in .env for runs.');
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
