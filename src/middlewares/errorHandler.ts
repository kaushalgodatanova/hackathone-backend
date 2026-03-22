import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Something went wrong';

  if (statusCode >= 500) {
    logger.error(
      {
        err,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.method === 'GET' || req.method === 'DELETE' ? undefined : req.body,
      },
      'Unhandled or server error',
    );
  } else if (!(err instanceof AppError)) {
    logger.warn({ err, path: req.path, method: req.method }, 'Unexpected error (non-AppError)');
  }

  const payload: Record<string, unknown> = {
    success: false,
    status: statusCode,
    message,
  };
  if (err instanceof AppError && err.details !== undefined) {
    payload.details = err.details;
  }

  res.status(statusCode).json(payload);
};
