const mongoose = require('mongoose');

// Base Error Class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specialized Error Types
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 503);
  }
}

class AuthError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    const message = Object.values(errors)
      .map(err => err.message)
      .join('. ');
    super(message, 400);
    this.errors = errors;
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource || 'Resource'} not found`, 404);
  }
}

// Error Handler Middleware
const handleError = (err, req, res, next) => {
  // Set default values if they don't exist
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    err = new AppError('Validation failed', 400);
  } else if (err.name === 'CastError') {
    err = new AppError('Invalid resource ID', 400);
  }

  // Development vs Production error responses
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR 💥', err);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  } else {
    // Production (don't leak stack traces)
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
};

// Utility Functions
const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

const notFound = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl}`));
};

module.exports = {
  AppError,
  DatabaseError,
  AuthError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  handleError,
  catchAsync,
  notFound
};