import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/** Logs to stdout only (no `./logs` directory — works locally and on PaaS). */
export const logger = pino({
  level: isProd ? 'info' : 'debug',
  ...(isProd
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
