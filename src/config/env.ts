import { config } from 'dotenv';
import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('8000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  /** Comma-separated allowed origins in production (must each be valid URLs). CORS reads raw `process.env.FRONTEND_URL`. */
  FRONTEND_URL: z.preprocess(
    (v) => (v === undefined || v === '' ? 'http://localhost:3000' : v),
    z
      .string()
      .transform((s) => s.trim())
      .refine(
        (s) =>
          s.split(',').every((part) => {
            const u = part.trim();
            if (!u) return true;
            try {
              const parsed = new URL(u);
              return parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch {
              return false;
            }
          }),
        { message: 'FRONTEND_URL must be one or more comma-separated valid URLs' },
      ),
  ),
  /** Server-side only; required for POST /retailer/cart/nl-preview */
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  BATCH_WINDOW_MINUTES: z.coerce.number().int().positive().default(30),
  /** Gap after a close before the next window opens (rolling schedule). */
  ROLLING_GAP_MINUTES: z.coerce.number().int().positive().default(30),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  EARLY_CLOSE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** Optional; if unset, first `delivery_partner` user is used for runs / early close. */
  DEFAULT_DELIVERY_PARTNER_ID: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
});

export type AppEnv = z.infer<typeof schema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    config();
    cachedEnv = schema.parse(process.env);
  }
  return cachedEnv;
}

export const loadEnv = (): void => {
  getEnv();
};
