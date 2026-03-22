import './init-env';
import { getEnv } from './config/env';
import { createServer } from './server';
import { logger } from './utils/logger';

const app = createServer();

/** Named export avoids a second Vercel entry from `export default` alongside `api/index.ts`. */
export { app };

/** Render / Docker / `npm start`: run compiled JS as the process entry. Vercel uses `api/index.ts`. */
if (require.main === module) {
  const port = Number(getEnv().PORT);
  app.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'HTTP server listening');
  });
}
