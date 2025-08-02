/**
 * @file errorHandler.ts
 * @description Comprehensive error handling middleware
 */
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorResponse } from '../utils/response';

// Error types
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

// Database error codes mapping
const DB_ERROR_CODES = {
  '23505': { status: 409, message: 'Duplicate entry' },
  '23503': { status: 400, message: 'Referenced record not found' },
  '23502': { status: 400, message: 'Required field missing' },
  '23514': { status: 400, message: 'Check constraint violation' },
  '42703': { status: 500, message: 'Database column does not exist' },
  '42P01': { status: 500, message: 'Database table does not exist' },
  '42601': { status: 500, message: 'Database syntax error' },
  '08006': { status: 503, message: 'Database connection failed' },
  '08001': { status: 503, message: 'Unable to connect to database' },
  '53300': { status: 503, message: 'Too many database connections' }
};

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  isOperational = true;
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  isOperational = true;
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;
  
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  isOperational = true;
  
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  isOperational = true;
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends Error {
  statusCode = 503;
  isOperational = true;
  
  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

// Error logging utility
function logError(error: AppError, req: Request) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    tenantId: (req as any).user?.tenantId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details
    }
  };

  if (error.statusCode && error.statusCode >= 500) {
    console.error('Server Error:', JSON.stringify(errorInfo, null, 2));
  } else if (error.statusCode && error.statusCode >= 400) {
    console.warn('Client Error:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error('Unknown Error:', JSON.stringify(errorInfo, null, 2));
  }
}

// Handle different error types
function handleDatabaseError(error: any): { statusCode: number; message: string; details?: any } {
  const dbError = DB_ERROR_CODES[error.code as keyof typeof DB_ERROR_CODES];
  
  if (dbError) {
    return {
      statusCode: dbError.status,
      message: dbError.message,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      } : undefined
    };
  }

  // Generic database error
  return {
    statusCode: 500,
    message: 'Database operation failed',
    details: process.env.NODE_ENV === 'development' ? {
      code: error.code,
      message: error.message
    } : undefined
  };
}

function handleValidationError(error: ZodError): { statusCode: number; message: string; details: any } {
  const errors = error.issues.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    received: err.received
  }));

  return {
    statusCode: 400,
    message: 'Validation failed',
    details: { errors }
  };
}

function handleJWTError(error: any): { statusCode: number; message: string } {
  if (error.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token expired' };
  }
  
  if (error.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token' };
  }
  
  if (error.name === 'NotBeforeError') {
    return { statusCode: 401, message: 'Token not active' };
  }

  return { statusCode: 401, message: 'Authentication failed' };
}

// Main error handling middleware
export function errorHandler(error: AppError, req: Request, res: Response, next: NextFunction) {
  // Log the error
  logError(error, req);

  // Handle different error types
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  // Database errors
  if (error.code && typeof error.code === 'string') {
    const dbErrorInfo = handleDatabaseError(error);
    statusCode = dbErrorInfo.statusCode;
    message = dbErrorInfo.message;
    details = dbErrorInfo.details;
  }
  
  // Zod validation errors
  else if (error instanceof ZodError) {
    const validationInfo = handleValidationError(error);
    statusCode = validationInfo.statusCode;
    message = validationInfo.message;
    details = validationInfo.details;
  }
  
  // JWT errors
  else if (error.name?.includes('Token') || error.name === 'JsonWebTokenError') {
    const jwtInfo = handleJWTError(error);
    statusCode = jwtInfo.statusCode;
    message = jwtInfo.message;
  }
  
  // Multer file upload errors
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large';
  }
  
  else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // Send error response
  return errorResponse(res, statusCode, message, details);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}

// Graceful shutdown handler
export function setupGracefulShutdown(server: any) {
  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err: any) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}

// Health check endpoint
export function healthCheck(req: Request, res: Response) {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(healthInfo);
}
