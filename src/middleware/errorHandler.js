// Global error handling middleware for graceful degradation
// Handles timeouts, API failures, and unexpected errors

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details || null
    });
  }

  if (err.name === 'TimeoutError') {
    return res.status(504).json({
      error: 'Request Timeout',
      message: 'The AI service took too long to respond. Please try again.',
      fallback: 'Service temporarily unavailable'
    });
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Unable to connect to external services. Please try again later.',
      fallback: 'System is experiencing connectivity issues'
    });
  }

  // AI/LLM specific errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again in a moment.',
      retryAfter: err.retryAfter || 60
    });
  }

  if (err.statusCode === 500 || err.name === 'InternalServerError') {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing your request.',
      fallback: 'Please try again or contact support if the issue persists'
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    error: err.name || 'Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async error wrapper to catch errors in async route handlers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
