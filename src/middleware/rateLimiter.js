import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import analytics from '../utils/analytics.js';

// Create rate limiter
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests',
    message: config.rateLimit.message,
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    analytics.trackError(
      new Error('RateLimitExceeded'),
      `${req.method} ${req.path}`
    );
    
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: config.rateLimit.message,
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  }
});

// Stricter rate limiter for specific endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests to this endpoint',
    message: 'You have exceeded the rate limit for this endpoint',
    retryAfter: 900
  }
});

export {
  limiter,
  strictLimiter
};

export default { limiter, strictLimiter };
