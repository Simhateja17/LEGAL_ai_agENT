const config = require('../config');
const logger = require('../utils/logger');
const analytics = require('../utils/analytics');

// Timeout middleware
const timeoutMiddleware = (timeoutMs = config.timeout.server) => {
  return (req, res, next) => {
    // Set timeout
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs);
    
    // Track if request has timed out
    let timedOut = false;
    
    const timeoutHandler = () => {
      if (!timedOut) {
        timedOut = true;
        
        logger.warn('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs
        });
        
        analytics.trackError(
          new Error('RequestTimeout'),
          `${req.method} ${req.path}`
        );
        
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        error.statusCode = 504;
        next(error);
      }
    };
    
    req.on('timeout', timeoutHandler);
    res.on('timeout', timeoutHandler);
    
    next();
  };
};

module.exports = timeoutMiddleware;
