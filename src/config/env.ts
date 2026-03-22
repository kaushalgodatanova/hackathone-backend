import { config } from 'dotenv';
import { z } from 'zod';

/** Vercel users often set `my-app.vercel.app` without a scheme; `new URL()` requires `http:` or `https:`. */
function normalizeFrontendUrlEnv(v: unknown): string {
  if (v === undefined || v === '') return 'http://localhost:3000';
  const raw = String(v).trim();
  const joined = raw
    .split(',')
    .map((part) => {
      const t = part.trim();
      if (!t) return '';
      if (/^https?:\/\//i.test(t)) return t;
      return `https://${t}`;
    })
    .filter(Boolean)
    .join(',');
  return joined || 'http://localhost:3000';
}

const schema = z.object({
  PORT: z.string().default('8000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  /** Comma-separated allowed origins in production (must each be valid URLs). CORS reads raw `process.env.FRONTEND_URL`. */
  FRONTEND_URL: z.preprocess(
    normalizeFrontendUrlEnv,
    z
      .string()
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
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      throw new Error(
        `Invalid or missing environment variables: ${JSON.stringify(fields)}. ` +
          'Set DATABASE_URL, JWT_SECRET (16+ chars), and FRONTEND_URL in Vercel → Settings → Environment Variables.',
      );
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}

export const loadEnv = (): void => {
  getEnv();
};
