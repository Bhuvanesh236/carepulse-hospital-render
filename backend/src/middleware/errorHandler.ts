import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('🔥 Server Error:', {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err.message && err.message.includes('ER_DUP_ENTRY')) {
    return res.status(409).json({
      success: false,
      message: 'A duplicate entry already exists with the provided information.'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational || statusCode < 500
    ? err.message
    : 'An unexpected internal server error occurred. Please try again later.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
}
