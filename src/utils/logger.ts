import pino from 'pino';

/** Vercel sets VERCEL=1; avoid pino-pretty there (devDependency, not in serverless bundle). */
const isProdLike =
  process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

/** Logs to stdout only (no `./logs` directory — works locally and on PaaS). */
export const logger = pino({
  level: isProdLike ? 'info' : 'debug',
  ...(isProdLike
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
          },
        },
      }),
});
