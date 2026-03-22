"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = void 0;
exports.getEnv = getEnv;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
const schema = zod_1.z.object({
    PORT: zod_1.z.string().default('8000'),
    DATABASE_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    /** Comma-separated allowed origins in production (must each be valid URLs). CORS reads raw `process.env.FRONTEND_URL`. */
    FRONTEND_URL: zod_1.z.preprocess((v) => (v === undefined || v === '' ? 'http://localhost:3000' : v), zod_1.z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s.split(',').every((part) => {
        const u = part.trim();
        if (!u)
            return true;
        try {
            const parsed = new URL(u);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        }
        catch {
            return false;
        }
    }), { message: 'FRONTEND_URL must be one or more comma-separated valid URLs' })),
    /** Server-side only; required for POST /retailer/cart/nl-preview */
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_MODEL: zod_1.z.string().optional(),
    BATCH_WINDOW_MINUTES: zod_1.z.coerce.number().int().positive().default(30),
    /** Gap after a close before the next window opens (rolling schedule). */
    ROLLING_GAP_MINUTES: zod_1.z.coerce.number().int().positive().default(30),
    APP_TIMEZONE: zod_1.z.string().default('Asia/Kolkata'),
    EARLY_CLOSE_ENABLED: zod_1.z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
    /** Optional; if unset, first `delivery_partner` user is used for runs / early close. */
    DEFAULT_DELIVERY_PARTNER_ID: zod_1.z.preprocess((v) => (v === '' || v === undefined || v === null ? undefined : Number(v)), zod_1.z.number().int().positive().optional()),
});
let cachedEnv = null;
function getEnv() {
    if (!cachedEnv) {
        (0, dotenv_1.config)();
        cachedEnv = schema.parse(process.env);
    }
    return cachedEnv;
}
const loadEnv = () => {
    getEnv();
};
exports.loadEnv = loadEnv;
