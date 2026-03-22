"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
    static notFound(message = 'Resource not found') {
        return new AppError(message, 404);
    }
    static badRequest(message = 'Bad request', details) {
        return new AppError(message, 400, details);
    }
    static conflict(message = 'Conflict', details) {
        return new AppError(message, 409, details);
    }
}
exports.AppError = AppError;
