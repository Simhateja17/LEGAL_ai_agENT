import logger from './logger.js';

// In-memory analytics storage
const analytics = {
  requests: {
    total: 0,
    byEndpoint: {},
    byMethod: {},
    byStatusCode: {}
  },
  errors: {
    total: 0,
    byType: {},
    byEndpoint: {}
  },
  performance: {
    responseTimes: [],
    queryLatencies: [],
    vectorSearchTimes: []
  },
  startTime: Date.now()
};

// Track request
const trackRequest = (req, res, responseTime) => {
  analytics.requests.total++;
  
  // Track by endpoint
  const endpoint = `${req.method} ${req.path}`;
  analytics.requests.byEndpoint[endpoint] = (analytics.requests.byEndpoint[endpoint] || 0) + 1;
  
  // Track by method
  analytics.requests.byMethod[req.method] = (analytics.requests.byMethod[req.method] || 0) + 1;
  
  // Track by status code
  const statusCode = res.statusCode;
  analytics.requests.byStatusCode[statusCode] = (analytics.requests.byStatusCode[statusCode] || 0) + 1;
  
  // Track response time
  analytics.performance.responseTimes.push(responseTime);
  
  // Keep only last 1000 response times
  if (analytics.performance.responseTimes.length > 1000) {
    analytics.performance.responseTimes.shift();
  }
  
  logger.debug('Request tracked', { endpoint, statusCode, responseTime });
};

// Track error
const trackError = (error, endpoint) => {
  analytics.errors.total++;
  
  // Track by error type
  const errorType = error.name || 'UnknownError';
  analytics.errors.byType[errorType] = (analytics.errors.byType[errorType] || 0) + 1;
  
  // Track by endpoint
  if (endpoint) {
    analytics.errors.byEndpoint[endpoint] = (analytics.errors.byEndpoint[endpoint] || 0) + 1;
  }
  
  logger.debug('Error tracked', { errorType, endpoint });
};

// Track query latency
const trackQueryLatency = (latency) => {
  analytics.performance.queryLatencies.push(latency);
  
  // Keep only last 1000 latencies
  if (analytics.performance.queryLatencies.length > 1000) {
    analytics.performance.queryLatencies.shift();
  }
};

// Track vector search time
const trackVectorSearch = (searchTime) => {
  analytics.performance.vectorSearchTimes.push(searchTime);
  
  // Keep only last 1000 search times
  if (analytics.performance.vectorSearchTimes.length > 1000) {
    analytics.performance.vectorSearchTimes.shift();
  }
};

// Calculate percentile
const calculatePercentile = (arr, percentile) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
};

// Get analytics summary
const getAnalytics = () => {
  const uptime = Date.now() - analytics.startTime;
  const responseTimes = analytics.performance.responseTimes;
  const queryLatencies = analytics.performance.queryLatencies;
  const vectorSearchTimes = analytics.performance.vectorSearchTimes;
  
  return {
    uptime: {
      ms: uptime,
      seconds: Math.floor(uptime / 1000),
      formatted: formatUptime(uptime)
    },
    requests: {
      total: analytics.requests.total,
      byEndpoint: analytics.requests.byEndpoint,
      byMethod: analytics.requests.byMethod,
      byStatusCode: analytics.requests.byStatusCode,
      requestsPerSecond: analytics.requests.total / (uptime / 1000)
    },
    errors: {
      total: analytics.errors.total,
      errorRate: analytics.requests.total > 0 
        ? ((analytics.errors.total / analytics.requests.total) * 100).toFixed(2) + '%'
        : '0%',
      byType: analytics.errors.byType,
      byEndpoint: analytics.errors.byEndpoint
    },
    performance: {
      responseTime: {
        avg: responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0,
        min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        p50: calculatePercentile(responseTimes, 50),
        p95: calculatePercentile(responseTimes, 95),
        p99: calculatePercentile(responseTimes, 99)
      },
      queryLatency: {
        avg: queryLatencies.length > 0 
          ? Math.round(queryLatencies.reduce((a, b) => a + b, 0) / queryLatencies.length)
          : 0,
        min: queryLatencies.length > 0 ? Math.min(...queryLatencies) : 0,
        max: queryLatencies.length > 0 ? Math.max(...queryLatencies) : 0,
        p50: calculatePercentile(queryLatencies, 50),
        p95: calculatePercentile(queryLatencies, 95),
        p99: calculatePercentile(queryLatencies, 99)
      },
      vectorSearch: {
        avg: vectorSearchTimes.length > 0 
          ? Math.round(vectorSearchTimes.reduce((a, b) => a + b, 0) / vectorSearchTimes.length)
          : 0,
        min: vectorSearchTimes.length > 0 ? Math.min(...vectorSearchTimes) : 0,
        max: vectorSearchTimes.length > 0 ? Math.max(...vectorSearchTimes) : 0,
        p50: calculatePercentile(vectorSearchTimes, 50),
        p95: calculatePercentile(vectorSearchTimes, 95),
        p99: calculatePercentile(vectorSearchTimes, 99)
      }
    }
  };
};

// Format uptime
const formatUptime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// Reset analytics
const resetAnalytics = () => {
  analytics.requests = {
    total: 0,
    byEndpoint: {},
    byMethod: {},
    byStatusCode: {}
  };
  analytics.errors = {
    total: 0,
    byType: {},
    byEndpoint: {}
  };
  analytics.performance = {
    responseTimes: [],
    queryLatencies: [],
    vectorSearchTimes: []
  };
  analytics.startTime = Date.now();
  
  logger.info('Analytics reset');
};

export {
  trackRequest,
  trackError,
  trackQueryLatency,
  trackVectorSearch,
  getAnalytics,
  resetAnalytics
};

export default {
  trackRequest,
  trackError,
  trackQueryLatency,
  trackVectorSearch,
  getAnalytics,
  resetAnalytics
};
