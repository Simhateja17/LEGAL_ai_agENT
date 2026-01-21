import logger from '../utils/logger.js';
import analytics from '../utils/analytics.js';

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.logRequest(req);
  
  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.logResponse(req, res, duration, {
      responseSize: JSON.stringify(body).length
    });
    
    // Track analytics
    analytics.trackRequest(req, res, duration);
    
    return originalJson(body);
  };
  
  next();
};

export { requestLogger };
export default requestLogger;
