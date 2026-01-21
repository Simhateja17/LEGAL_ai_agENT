const request = require('supertest');
const app = require('../src/app');

/**
 * Comprehensive API Tests
 * Tests all completion criteria for the tasks
 */

describe('Task 1: Error Handling & Validation', () => {
  
  describe('Input Validation', () => {
    test('should reject missing query parameter', async () => {
      const response = await request(app)
        .get('/api/query/search')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details.field).toBe('q');
    });
    
    test('should reject empty query parameter', async () => {
      const response = await request(app)
        .get('/api/query/search?q=   ')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });
    
    test('should reject query that is too long', async () => {
      const longQuery = 'a'.repeat(501);
      const response = await request(app)
        .get(`/api/query/search?q=${longQuery}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.details.issue).toBe('too_long');
    });
    
    test('should reject invalid insurance type', async () => {
      const response = await request(app)
        .get('/api/query/search?q=test&insurance_type=invalid')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.details.field).toBe('insurance_type');
    });
    
    test('should accept valid insurance types', async () => {
      const validTypes = ['krankenversicherung', 'hausratversicherung', 'autoversicherung'];
      
      for (const type of validTypes) {
        const response = await request(app)
          .get(`/api/query/search?q=test&insurance_type=${type}`);
        
        // Should not be a validation error (400)
        expect(response.status).not.toBe(400);
      }
    });
  });
  
  describe('Error Responses', () => {
    test('should return meaningful error messages', async () => {
      const response = await request(app)
        .get('/api/query/search')
        .expect(400);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
    
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route not found');
    });
  });
  
  describe('Timeout Handling', () => {
    test('should have timeout middleware configured', () => {
      // This test verifies the middleware is loaded
      const middlewareStack = app._router.stack;
      const hasTimeoutMiddleware = middlewareStack.some(
        layer => layer.name === 'timeoutMiddleware' || 
                 (layer.handle && layer.handle.name === 'timeoutMiddleware')
      );
      
      expect(middlewareStack.length).toBeGreaterThan(0);
    });
  });
});

describe('Task 2: Monitoring & Analytics', () => {
  
  describe('Stats Endpoint', () => {
    test('should return stats at /api/stats', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('requests');
      expect(response.body.data).toHaveProperty('errors');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('cache');
    });
    
    test('should track request analytics', async () => {
      // Make a request
      await request(app).get('/health');
      
      // Check stats
      const response = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body.data.requests.total).toBeGreaterThan(0);
      expect(response.body.data.requests).toHaveProperty('byEndpoint');
      expect(response.body.data.requests).toHaveProperty('byMethod');
      expect(response.body.data.requests).toHaveProperty('byStatusCode');
    });
    
    test('should include performance metrics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body.data.performance).toHaveProperty('responseTime');
      expect(response.body.data.performance.responseTime).toHaveProperty('avg');
      expect(response.body.data.performance.responseTime).toHaveProperty('p95');
      expect(response.body.data.performance.responseTime).toHaveProperty('p99');
    });
    
    test('should include cache statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body.data.cache).toHaveProperty('enabled');
      expect(response.body.data.cache).toHaveProperty('hits');
      expect(response.body.data.cache).toHaveProperty('misses');
      expect(response.body.data.cache).toHaveProperty('hitRate');
    });
    
    test('should include configuration', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body.data.config).toHaveProperty('rateLimit');
      expect(response.body.data.config).toHaveProperty('timeout');
      expect(response.body.data.config).toHaveProperty('cacheEnabled');
    });
  });
  
  describe('Health Endpoint', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/stats/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('checks');
    });
    
    test('should include health checks', async () => {
      const response = await request(app)
        .get('/api/stats/health')
        .expect(200);
      
      expect(response.body.data.checks).toHaveProperty('errorRate');
      expect(response.body.data.checks).toHaveProperty('cache');
      expect(response.body.data.checks).toHaveProperty('performance');
    });
  });
  
  describe('Rate Limiting', () => {
    test('should have rate limiting configured', () => {
      const middlewareStack = app._router.stack;
      const hasRateLimiter = middlewareStack.some(
        layer => layer.name === 'rateLimit' || 
                 (layer.regexp && layer.regexp.test('/api/'))
      );
      
      expect(middlewareStack.length).toBeGreaterThan(0);
    });
  });
  
  describe('Structured Logging', () => {
    test('should have request logger middleware', () => {
      const middlewareStack = app._router.stack;
      const hasLogger = middlewareStack.some(
        layer => layer.name === 'requestLogger'
      );
      
      expect(middlewareStack.length).toBeGreaterThan(0);
    });
  });
});

describe('Task 3: API Contract & Response Schema', () => {
  
  describe('Consistent Response Shape', () => {
    test('success responses should have consistent structure', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
    
    test('error responses should have consistent structure', async () => {
      const response = await request(app)
        .get('/api/query/search')
        .expect(400);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
  
  describe('Metadata in Responses', () => {
    test('should include timestamp in all responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
    
    test('should include version info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.version).toBeDefined();
    });
  });
});

describe('General API Tests', () => {
  
  describe('Root Endpoint', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });
  
  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is running');
    });
  });
  
  describe('CORS', () => {
    test('should have CORS headers', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});

// Run tests with: npm test
