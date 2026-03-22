"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const server_1 = require("./server");
const logger_1 = require("./utils/logger");
(0, env_1.loadEnv)();
const app = (0, server_1.createServer)();
exports.default = app;
/** Render / Docker / `npm start`: run compiled JS as the process entry. Vercel uses `api/index.ts` and does not execute this block. */
if (require.main === module) {
    const port = Number((0, env_1.getEnv)().PORT);
    app.listen(port, '0.0.0.0', () => {
        logger_1.logger.info({ port }, 'HTTP server listening');
    });
}
