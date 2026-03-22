import { getEnv, loadEnv } from './config/env';
import { createServer } from './server';
import { logger } from './utils/logger';

loadEnv();

const app = createServer();

export default app;

/** Render / Docker / `npm start`: run compiled JS as the process entry. Vercel uses `api/index.ts` and does not execute this block. */
if (require.main === module) {
  const port = Number(getEnv().PORT);
  app.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'HTTP server listening');
  });
}
