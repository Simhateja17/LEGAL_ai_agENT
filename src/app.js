const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const { limiter } = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const timeoutMiddleware = require('./middleware/timeout');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Apply timeout middleware first
app.use(timeoutMiddleware(config.timeout.server));

// CORS middleware
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// Rate limiting middleware
app.use('/api/', limiter);

// Import routes
const queryRoutes = require('./routes/query.routes');
const insurersRoutes = require('./routes/insurers.routes');
const statsRoutes = require('./routes/stats.routes');

// Mount routes under /api prefix
app.use('/api/query', queryRoutes);
app.use('/api/insurers', insurersRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: config.apiVersion
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'German Insurance Backend API',
    version: config.apiVersion,
    endpoints: {
      health: '/health',
      stats: '/api/stats',
      search: '/api/query/search?q=your_query',
      insurers: '/api/insurers'
    },
    documentation: '/api/docs'
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
