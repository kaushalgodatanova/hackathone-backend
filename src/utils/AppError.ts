export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404);
  }

  static badRequest(message = 'Bad request', details?: unknown): AppError {
    return new AppError(message, 400, details);
  }

  static conflict(message = 'Conflict', details?: unknown): AppError {
    return new AppError(message, 409, details);
  }
}
