import { decimal, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

import { deliverySitesTable } from './delivery_sites';

export const usersTable = mysqlTable('Users', {
  id: int('id').primaryKey().notNull().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  defaultDeliverySiteId: int('default_delivery_site_id').references(() => deliverySitesTable.id, {
    onDelete: 'set null',
  }),
  depotSiteId: int('depot_site_id').references(() => deliverySitesTable.id, { onDelete: 'set null' }),
  partnerCapacityKg: decimal('partner_capacity_kg', { precision: 10, scale: 3 }),
  vehicleLabel: varchar('vehicle_label', { length: 128 }),
});
