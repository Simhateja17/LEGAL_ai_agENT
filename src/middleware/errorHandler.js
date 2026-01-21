import logger from '../utils/logger.js';
import analytics from '../utils/analytics.js';

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.logError(err, req);
  
  // Track error in analytics
  const endpoint = req ? `${req.method} ${req.path}` : 'unknown';
  analytics.trackError(err, endpoint);
  
  // Default status code
  const statusCode = err.statusCode || 500;
  
  // Determine error type and response
  let errorResponse = {
    success: false,
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req ? req.path : undefined
  };
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation Error';
    errorResponse.details = err.details || null;
    return res.status(400).json(errorResponse);
  }
  
  if (err.name === 'TimeoutError') {
    errorResponse.error = 'Request Timeout';
    errorResponse.message = 'The request took too long to process. Please try again.';
    return res.status(504).json(errorResponse);
  }
  
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    errorResponse.error = 'Service Unavailable';
    errorResponse.message = 'Unable to connect to external services. Please try again later.';
    return res.status(503).json(errorResponse);
  }
  
  // Rate limit errors
  if (err.statusCode === 429 || err.name === 'RateLimitExceeded') {
    errorResponse.error = 'Rate Limit Exceeded';
    errorResponse.message = 'Too many requests. Please try again later.';
    errorResponse.retryAfter = err.retryAfter || 60;
    return res.status(429).json(errorResponse);
  }
  
  // Database errors
  if (err.code === 'PGRST' || err.name === 'DatabaseError') {
    errorResponse.error = 'Database Error';
    errorResponse.message = 'A database error occurred. Please try again.';
    return res.status(503).json(errorResponse);
  }
  
  // AI/LLM service errors
  if (err.name === 'AIServiceError') {
    errorResponse.error = 'AI Service Error';
    errorResponse.message = 'The AI service encountered an error. Please try again.';
    return res.status(503).json(errorResponse);
  }
  
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    errorResponse.message = 'An internal server error occurred';
    delete errorResponse.details;
    delete err.stack;
  } else {
    // Include stack trace in development
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export { errorHandler, asyncHandler };
export default errorHandler;
