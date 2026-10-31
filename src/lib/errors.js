class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') { super(message); this.statusCode = statusCode; this.code = code; this.isOperational = true; }
}
const notFound = (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND');
module.exports = { AppError, notFound };
