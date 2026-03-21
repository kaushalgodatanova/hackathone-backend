import { eq } from 'drizzle-orm';

import { db } from '../../database/db';
import { deliverySitesTable } from '../../database/schema/delivery_sites';

export class DeliveryService {
  static async listSites(options: { retailDropsOnly: boolean }): Promise<
    {
      id: number;
      label: string;
      latitude: number;
      longitude: number;
      city: string | null;
      area: string | null;
      isRetailDrop: boolean;
    }[]
  > {
    const rows = options.retailDropsOnly
      ? await db.select().from(deliverySitesTable).where(eq(deliverySitesTable.isRetailDrop, true))
      : await db.select().from(deliverySitesTable);

    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      city: r.city ?? null,
      area: r.area ?? null,
      isRetailDrop: r.isRetailDrop,
    }));
  }
}
