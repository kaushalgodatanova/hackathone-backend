import { boolean, decimal, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const deliverySitesTable = mysqlTable('Delivery_sites', {
  id: int('id').primaryKey().notNull().autoincrement(),
  label: varchar('label', { length: 255 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  city: varchar('city', { length: 128 }),
  area: varchar('area', { length: 128 }),
  /** When false, hide from retailer dropdown (depot-only rows). */
  isRetailDrop: boolean('is_retail_drop').notNull().default(true),
});
