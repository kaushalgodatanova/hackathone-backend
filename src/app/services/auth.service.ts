import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../database/db';
import { deliverySitesTable } from '../../database/schema/delivery_sites';
import { usersTable } from '../../database/schema/users';
import { AppError } from '../../utils/AppError';
import { signAccessToken } from '../../utils/jwt';
import type { LoginBody, RegisterBody } from '../../validators/auth.validator';
import type { PatchMeProfileBody } from '../../validators/users.validator';

const SALT_ROUNDS = 10;

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type PublicUser = {
  id: number;
  email: string;
  role: string;
  name: string;
  defaultDeliverySiteId: number | null;
  depotSiteId: number | null;
  partnerCapacityKg: number | null;
  vehicleLabel: string | null;
};

function toPublic(row: typeof usersTable.$inferSelect): PublicUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    defaultDeliverySiteId: row.defaultDeliverySiteId ?? null,
    depotSiteId: row.depotSiteId ?? null,
    partnerCapacityKg: num(row.partnerCapacityKg),
    vehicleLabel: row.vehicleLabel ?? null,
  };
}

export class AuthService {
  static async register(
    body: RegisterBody,
  ): Promise<{ accessToken: string; user: PublicUser } | { error: 'email_taken' }> {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, body.email))
      .limit(1);

    if (existing.length > 0) {
      return { error: 'email_taken' };
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const [inserted] = await db
      .insert(usersTable)
      .values({
        email: body.email,
        passwordHash,
        role: body.role,
        name: body.name,
      })
      .$returningId();

    const id = inserted.id;
    const userRow = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    const user = userRow[0];
    if (!user) {
      throw new Error('User not found after insert');
    }

    const publicUser = toPublic(user);
    const accessToken = await signAccessToken({
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      name: publicUser.name,
    });

    return { accessToken, user: publicUser };
  }

  static async login(
    body: LoginBody,
  ): Promise<{ accessToken: string; user: PublicUser } | { error: 'invalid_credentials' }> {
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);

    const user = rows[0];
    if (!user) {
      return { error: 'invalid_credentials' };
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      return { error: 'invalid_credentials' };
    }

    const publicUser = toPublic(user);
    const accessToken = await signAccessToken({
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      name: publicUser.name,
    });

    return { accessToken, user: publicUser };
  }

  static async getProfile(userId: number): Promise<PublicUser> {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!row) throw AppError.notFound('User not found');
    return toPublic(row);
  }

  static async patchProfile(userId: number, role: string, body: PatchMeProfileBody): Promise<PublicUser> {
    const updates: Partial<typeof usersTable.$inferInsert> = {};

    if (role === 'retailer' && body.defaultDeliverySiteId !== undefined) {
      if (body.defaultDeliverySiteId !== null) {
        const [site] = await db
          .select()
          .from(deliverySitesTable)
          .where(eq(deliverySitesTable.id, body.defaultDeliverySiteId))
          .limit(1);
        if (!site) throw AppError.badRequest('Invalid delivery site');
        if (!site.isRetailDrop) throw AppError.badRequest('This site is not available for retail delivery');
      }
      updates.defaultDeliverySiteId = body.defaultDeliverySiteId;
    }

    if (role === 'distributor' && body.depotSiteId !== undefined) {
      if (body.depotSiteId !== null) {
        const [site] = await db
          .select()
          .from(deliverySitesTable)
          .where(eq(deliverySitesTable.id, body.depotSiteId))
          .limit(1);
        if (!site) throw AppError.badRequest('Invalid depot site');
      }
      updates.depotSiteId = body.depotSiteId;
    }

    if (role === 'delivery_partner') {
      if (body.partnerCapacityKg !== undefined) {
        updates.partnerCapacityKg = body.partnerCapacityKg === null ? null : String(body.partnerCapacityKg);
      }
      if (body.vehicleLabel !== undefined) {
        updates.vehicleLabel = body.vehicleLabel;
      }
    }

    if (Object.keys(updates).length === 0) {
      return AuthService.getProfile(userId);
    }

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    return AuthService.getProfile(userId);
  }
}
