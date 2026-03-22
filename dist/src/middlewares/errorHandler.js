"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorHandler = (err, req, res, _next) => {
    const statusCode = err instanceof AppError_1.AppError ? err.statusCode : 500;
    const message = err instanceof AppError_1.AppError ? err.message : 'Something went wrong';
    if (statusCode >= 500) {
        logger_1.logger.error({
            err,
            path: req.path,
            method: req.method,
            query: req.query,
            body: req.method === 'GET' || req.method === 'DELETE' ? undefined : req.body,
        }, 'Unhandled or server error');
    }
    else if (!(err instanceof AppError_1.AppError)) {
        logger_1.logger.warn({ err, path: req.path, method: req.method }, 'Unexpected error (non-AppError)');
    }
    const payload = {
        success: false,
        status: statusCode,
        message,
    };
    if (err instanceof AppError_1.AppError && err.details !== undefined) {
        payload.details = err.details;
    }
    res.status(statusCode).json(payload);
};
exports.errorHandler = errorHandler;
