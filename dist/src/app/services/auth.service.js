"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../database/db");
const delivery_sites_1 = require("../../database/schema/delivery_sites");
const users_1 = require("../../database/schema/users");
const AppError_1 = require("../../utils/AppError");
const jwt_1 = require("../../utils/jwt");
const SALT_ROUNDS = 10;
function num(v) {
    if (v === null || v === undefined)
        return null;
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function toPublic(row) {
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
class AuthService {
    static async register(body) {
        const existing = await db_1.db
            .select({ id: users_1.usersTable.id })
            .from(users_1.usersTable)
            .where((0, drizzle_orm_1.eq)(users_1.usersTable.email, body.email))
            .limit(1);
        if (existing.length > 0) {
            return { error: 'email_taken' };
        }
        const passwordHash = await bcryptjs_1.default.hash(body.password, SALT_ROUNDS);
        const [inserted] = await db_1.db
            .insert(users_1.usersTable)
            .values({
            email: body.email,
            passwordHash,
            role: body.role,
            name: body.name,
        })
            .$returningId();
        const id = inserted.id;
        const userRow = await db_1.db.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, id)).limit(1);
        const user = userRow[0];
        if (!user) {
            throw new Error('User not found after insert');
        }
        const publicUser = toPublic(user);
        const accessToken = await (0, jwt_1.signAccessToken)({
            id: publicUser.id,
            email: publicUser.email,
            role: publicUser.role,
            name: publicUser.name,
        });
        return { accessToken, user: publicUser };
    }
    static async login(body) {
        const rows = await db_1.db.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.email, body.email)).limit(1);
        const user = rows[0];
        if (!user) {
            return { error: 'invalid_credentials' };
        }
        const ok = await bcryptjs_1.default.compare(body.password, user.passwordHash);
        if (!ok) {
            return { error: 'invalid_credentials' };
        }
        const publicUser = toPublic(user);
        const accessToken = await (0, jwt_1.signAccessToken)({
            id: publicUser.id,
            email: publicUser.email,
            role: publicUser.role,
            name: publicUser.name,
        });
        return { accessToken, user: publicUser };
    }
    static async getProfile(userId) {
        const [row] = await db_1.db.select().from(users_1.usersTable).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, userId)).limit(1);
        if (!row)
            throw AppError_1.AppError.notFound('User not found');
        return toPublic(row);
    }
    static async patchProfile(userId, role, body) {
        const updates = {};
        if (role === 'retailer' && body.defaultDeliverySiteId !== undefined) {
            if (body.defaultDeliverySiteId !== null) {
                const [site] = await db_1.db
                    .select()
                    .from(delivery_sites_1.deliverySitesTable)
                    .where((0, drizzle_orm_1.eq)(delivery_sites_1.deliverySitesTable.id, body.defaultDeliverySiteId))
                    .limit(1);
                if (!site)
                    throw AppError_1.AppError.badRequest('Invalid delivery site');
                if (!site.isRetailDrop)
                    throw AppError_1.AppError.badRequest('This site is not available for retail delivery');
            }
            updates.defaultDeliverySiteId = body.defaultDeliverySiteId;
        }
        if (role === 'distributor' && body.depotSiteId !== undefined) {
            if (body.depotSiteId !== null) {
                const [site] = await db_1.db
                    .select()
                    .from(delivery_sites_1.deliverySitesTable)
                    .where((0, drizzle_orm_1.eq)(delivery_sites_1.deliverySitesTable.id, body.depotSiteId))
                    .limit(1);
                if (!site)
                    throw AppError_1.AppError.badRequest('Invalid depot site');
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
        await db_1.db.update(users_1.usersTable).set(updates).where((0, drizzle_orm_1.eq)(users_1.usersTable.id, userId));
        return AuthService.getProfile(userId);
    }
}
exports.AuthService = AuthService;
