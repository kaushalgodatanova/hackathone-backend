"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
/** Express 5 exposes `query` / `params` as getter-only; assign via defineProperty. */
function setParsed(req, key, value) {
    Object.defineProperty(req, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
    });
}
const validate = (schemas) => (req, res, next) => {
    try {
        if (schemas.params) {
            setParsed(req, 'params', schemas.params.parse(req.params));
        }
        if (schemas.query) {
            setParsed(req, 'query', schemas.query.parse(req.query));
        }
        if (schemas.body) {
            setParsed(req, 'body', schemas.body.parse(req.body));
        }
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            // Figure out which schema failed (body, params, query)
            // Because you call parse separately, you can catch which failed by checking err.errors[0].path or
            // better: try/catch individually for better granularity
            // But here we just fallback with a helper function:
            const formatErrors = (zodError, fieldName) => zodError.errors.map((e) => ({
                field: e.path.length > 0 ? `${fieldName}.${e.path.join('.')}` : fieldName,
                message: e.message,
            }));
            let errors = [];
            if (schemas.params) {
                try {
                    schemas.params.parse(req.params);
                }
                catch (e) {
                    if (e instanceof zod_1.ZodError) {
                        errors = formatErrors(e, 'params');
                    }
                }
            }
            if (schemas.query && errors.length === 0) {
                try {
                    schemas.query.parse(req.query);
                }
                catch (e) {
                    if (e instanceof zod_1.ZodError) {
                        errors = formatErrors(e, 'query');
                    }
                }
            }
            if (schemas.body && errors.length === 0) {
                try {
                    schemas.body.parse(req.body);
                }
                catch (e) {
                    if (e instanceof zod_1.ZodError) {
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
exports.validate = validate;
