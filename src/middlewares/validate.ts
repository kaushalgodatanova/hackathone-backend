import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';

type ValidationSchemas = {
  params?: ZodSchema;
  query?: ZodSchema;
  body?: ZodSchema;
};

/** Express 5 exposes `query` / `params` as getter-only; assign via defineProperty. */
function setParsed<K extends 'params' | 'query' | 'body'>(req: Request, key: K, value: Request[K]): void {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        setParsed(req, 'params', schemas.params.parse(req.params) as Request['params']);
      }

      if (schemas.query) {
        setParsed(req, 'query', schemas.query.parse(req.query) as Request['query']);
      }

      if (schemas.body) {
        setParsed(req, 'body', schemas.body.parse(req.body) as Request['body']);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Figure out which schema failed (body, params, query)
        // Because you call parse separately, you can catch which failed by checking err.errors[0].path or
        // better: try/catch individually for better granularity
        // But here we just fallback with a helper function:

        const formatErrors = (zodError: ZodError, fieldName: string): { field: string; message: string }[] =>
          zodError.errors.map((e) => ({
            field: e.path.length > 0 ? `${fieldName}.${e.path.join('.')}` : fieldName,
            message: e.message,
          }));

        let errors: { field: string; message: string }[] = [];

        if (schemas.params) {
          try {
            schemas.params.parse(req.params);
          } catch (e) {
            if (e instanceof ZodError) {
              errors = formatErrors(e, 'params');
            }
          }
        }
        if (schemas.query && errors.length === 0) {
          try {
            schemas.query.parse(req.query);
          } catch (e) {
            if (e instanceof ZodError) {
              errors = formatErrors(e, 'query');
            }
          }
        }
        if (schemas.body && errors.length === 0) {
          try {
            schemas.body.parse(req.body);
          } catch (e) {
            if (e instanceof ZodError) {
              errors = formatErrors(e, 'body');
            }
          }
        }

        res.status(400).json({
          message: 'Validation Error',
          errors,
        });
        return;
      }

      next(err);
    }
  };
