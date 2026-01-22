import logger from '../utils/logger.js';
import analytics from '../utils/analytics.js';

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request - simplified
  logger.info(`${req.method} ${req.path}${Object.keys(req.query).length > 0 ? ` [${new URLSearchParams(req.query).toString()}]` : ''}`);
  
  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    // Log response - simplified
    logger.info(`${res.statusCode} ${req.method} ${req.path} - ${duration}ms`);
    
    // Track analytics
    analytics.trackRequest(req, res, duration);
    
    return originalJson(body);
  };
  
  next();
};

export { requestLogger };
export default requestLogger;
