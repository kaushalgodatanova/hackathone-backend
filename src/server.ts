import { BatchService } from './app/services/batch.service';
import { createApp } from './config/express';
import { logger } from './utils/logger';

export const startServer = (): void => {
  const app = createApp();

  const PORT = process.env.PORT || 8000;

  void BatchService.ensureOpenBatchOnStartup().catch((err: unknown) => {
    const cause =
      err && typeof err === 'object' && 'cause' in err ? (err as { cause?: { code?: string } }).cause : undefined;
    const refused = cause?.code === 'ECONNREFUSED' || String(err).includes('ECONNREFUSED');
    logger.error(
      {
        err,
        hint: refused
          ? 'MySQL refused the connection. Set DATABASE_URL to a reachable host:port. In Docker, use the database service name (e.g. mysql:3306), not localhost.'
          : 'Verify DATABASE_URL, TLS/ssl-mode if required, and that the database exists.',
      },
      'Database connection failed during startup (ensureOpenBatchOnStartup)',
    );
    process.exit(1);
  });

  setInterval(() => {
    void BatchService.tick().catch((err: unknown) => {
      logger.error({ err }, 'Batch tick failed');
    });
  }, 15_000);

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
};
