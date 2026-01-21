import analytics from '../utils/analytics.js';
import cache from '../utils/cache.js';
import config from '../config/index.js';
import * as ragService from '../services/rag.service.js';

/**
 * Get API statistics and metrics
 */
export const getStats = async (req, res) => {
  try {
    const analyticsData = analytics.getAnalytics();
    const cacheStats = cache.getStats();
    
    res.status(200).json({
      success: true,
      data: {
        version: config.apiVersion,
        uptime: analyticsData.uptime,
        requests: analyticsData.requests,
        errors: analyticsData.errors,
        performance: analyticsData.performance,
        cache: cacheStats,
        config: {
          rateLimit: {
            windowMs: config.rateLimit.windowMs,
            maxRequests: config.rateLimit.maxRequests
          },
          timeout: config.timeout.server,
          cacheEnabled: config.cache.enabled,
          cacheTTL: config.cache.ttl
        },
        targets: config.performance
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Get health status
 */
export const getHealth = async (req, res) => {
  try {
    const analyticsData = analytics.getAnalytics();
    const cacheStats = cache.getStats();
    
    // Check if error rate is acceptable
    const errorRate = parseFloat(analyticsData.errors.errorRate);
    const isHealthy = errorRate < 5; // Less than 5% error rate
    
    res.status(isHealthy ? 200 : 503).json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        uptime: analyticsData.uptime.formatted,
        version: config.apiVersion,
        checks: {
          errorRate: {
            status: errorRate < 5 ? 'pass' : 'fail',
            value: analyticsData.errors.errorRate,
            threshold: '5%'
          },
          cache: {
            status: config.cache.enabled ? 'enabled' : 'disabled',
            hitRate: `${cacheStats.hitRate}%`
          },
          performance: {
            queryLatencyP95: `${analyticsData.performance.queryLatency.p95}ms`,
            target: `${config.performance.queryLatencyTarget}ms`
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getHealth:', error);
    res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: error.message
    });
  }
};

/**
 * Reset analytics (admin only - should be protected in production)
 */
export const resetStats = async (req, res) => {
  try {
    analytics.resetAnalytics();
    cache.resetStats();
    
    res.status(200).json({
      success: true,
      message: 'Analytics and cache statistics have been reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in resetStats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Get RAG system status and configuration
 */
export const getRagStatus = async (req, res) => {
  try {
    const ragInfo = ragService.getRagServiceInfo();
    
    res.status(200).json({
      success: true,
      data: {
        status: 'operational',
        mode: ragInfo.embedding.fallbackMode ? 'fallback' : 'production',
        services: {
          embedding: {
            provider: ragInfo.embedding.provider,
            model: ragInfo.embedding.model,
            dimension: ragInfo.embedding.dimension,
            initialized: !ragInfo.embedding.fallbackMode || true
          },
          llm: {
            provider: ragInfo.llm.provider,
            model: ragInfo.llm.model,
            temperature: ragInfo.llm.temperature,
            maxTokens: ragInfo.llm.maxTokens,
            initialized: !ragInfo.llm.fallbackMode || true
          },
          vectorStore: {
            type: ragInfo.mockDocumentsInitialized ? 'mock' : 'supabase',
            documentsCount: ragInfo.mockDocumentsCount,
            initialized: true
          }
        },
        config: ragInfo.config,
        recommendations: ragInfo.embedding.fallbackMode ? [
          'Set VERTEX_AI_PROJECT_ID for production embeddings',
          'Configure GOOGLE_APPLICATION_CREDENTIALS',
          'Set RAG_FALLBACK_MODE=false for production',
          'Connect Supabase for persistent vector storage'
        ] : []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getRagStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
