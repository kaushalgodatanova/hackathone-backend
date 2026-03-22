/**
 * Import this file before any module that touches `database/db.ts`.
 * Ensures env is validated and `process.env` is ready before Drizzle initializes.
 */
import { loadEnv } from './config/env';

loadEnv();
