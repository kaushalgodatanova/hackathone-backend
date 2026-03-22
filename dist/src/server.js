"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const batch_service_1 = require("./app/services/batch.service");
const express_1 = require("./config/express");
const logger_1 = require("./utils/logger");
let isInitialized = false;
const createServer = () => {
    const app = (0, express_1.createApp)();
    // Run only once per cold start
    if (!isInitialized) {
        isInitialized = true;
        void batch_service_1.BatchService.ensureOpenBatchOnStartup().catch((err) => {
            const cause = err && typeof err === 'object' && 'cause' in err ? err.cause : undefined;
            const refused = cause?.code === 'ECONNREFUSED' || String(err).includes('ECONNREFUSED');
            logger_1.logger.error({
                err,
                hint: refused
                    ? 'MySQL refused connection. Check DATABASE_URL host/port.'
                    : 'Verify DATABASE_URL and DB availability.',
            }, 'Database connection failed during startup');
            // ❌ DO NOT use process.exit in serverless
        });
    }
    return app;
};
exports.createServer = createServer;
