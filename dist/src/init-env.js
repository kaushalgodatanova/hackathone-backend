"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Import this file before any module that touches `database/db.ts`.
 * Ensures env is validated and `process.env` is ready before Drizzle initializes.
 */
const env_1 = require("./config/env");
(0, env_1.loadEnv)();
