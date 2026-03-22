import cors from 'cors';
import express, { Express } from 'express';
import routes from '../app/routes';
import { getEnv } from './env';
import { errorHandler } from '../middlewares/errorHandler';
import { loggerMiddleware } from '../middlewares/loggerMiddleware';

function corsOrigins(): string | string[] {
  const raw = getEnv().FRONTEND_URL;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return 'http://localhost:3000';
  if (list.length === 1) return list[0]!;
  return list;
}

const isProduction =
  process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

export const createApp = (): Express => {
  const app = express();

  app.use(
    cors({
      // Dev: reflect browser Origin so any localhost port (3000, 3001, …) works without CORS errors.
      // Prod: only listed FRONTEND_URL value(s).
      origin: isProduction ? corsOrigins() : true,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use(loggerMiddleware);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ message: 'OK' });
  });

  app.use('/api', routes);

  // Handle Error
  app.use(errorHandler);

  return app;
};
