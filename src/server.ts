import { BatchService } from './app/services/batch.service';
import { createApp } from './config/express';
import { logger } from './utils/logger';

let isInitialized = false;

export const createServer = () => {
  const app = createApp();

  // Run only once per cold start
  if (!isInitialized) {
    isInitialized = true;

    void BatchService.ensureOpenBatchOnStartup().catch((err: unknown) => {
      const cause =
        err && typeof err === 'object' && 'cause' in err ? (err as { cause?: { code?: string } }).cause : undefined;

      const refused = cause?.code === 'ECONNREFUSED' || String(err).includes('ECONNREFUSED');

      logger.error(
        {
          err,
          hint: refused
            ? 'MySQL refused connection. Check DATABASE_URL host/port.'
            : 'Verify DATABASE_URL and DB availability.',
        },
        'Database connection failed during startup',
      );

      // ❌ DO NOT use process.exit in serverless
    });
  }

  return app;
};
