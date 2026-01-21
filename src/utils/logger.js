import winston from 'winston';
import config from '../config/index.js';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging?.level || 'info',
  format: logFormat,
  defaultMeta: { service: 'german-insurance-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for errors
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport for all logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add structured logging methods
logger.logRequest = (req, metadata = {}) => {
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...metadata
  });
};

logger.logResponse = (req, res, duration, metadata = {}) => {
  logger.info('Response sent', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ...metadata
  });
};

logger.logError = (error, req, metadata = {}) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    method: req?.method,
    path: req?.path,
    ...metadata
  });
};

export default logger;
