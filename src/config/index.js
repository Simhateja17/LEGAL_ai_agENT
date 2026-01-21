import dotenv from 'dotenv';
dotenv.config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: '1.0.0',

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later'
  },

  // Timeout configuration
  timeout: {
    server: parseInt(process.env.SERVER_TIMEOUT_MS) || 30000, // 30 seconds
    database: parseInt(process.env.DB_TIMEOUT_MS) || 10000,   // 10 seconds
    external: parseInt(process.env.EXTERNAL_TIMEOUT_MS) || 20000 // 20 seconds
  },

  // Cache configuration
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL_SECONDS) || 300, // 5 minutes
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD_SECONDS) || 60,
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  },

  // Performance targets
  performance: {
    queryLatencyTarget: 500,    // ms (p95)
    vectorSearchTarget: 200,    // ms
    cacheHitRateTarget: 0.30    // 30%
  },

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },

  // Azure OpenAI Configuration
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    
    // Embedding configuration (text-embedding-3-small)
    embedding: {
      deployment: process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small',
      apiVersion: process.env.AZURE_EMBEDDING_API_VERSION || '2023-05-15',
      dimension: parseInt(process.env.EMBEDDING_DIMENSION) || 1536
    },
    
    // LLM configuration (gpt-4o-mini)
    llm: {
      deployment: process.env.AZURE_LLM_DEPLOYMENT || 'gpt-4o-mini',
      apiVersion: process.env.AZURE_LLM_API_VERSION || '2025-01-01-preview',
      temperature: parseFloat(process.env.AZURE_LLM_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.AZURE_LLM_MAX_TOKENS) || 2048
    }
  },

  // RAG configuration
  rag: {
    // Vector search settings
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7,
    maxResults: parseInt(process.env.MAX_RESULTS) || 5,
    
    // Chunking settings (for data processing)
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 800,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 75,
    
    // Context window settings
    maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH) || 4000,
    
    // Retry settings
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS) || 1000,
    
    // Enable fallback mode (uses mock data when Vertex AI is not configured)
    fallbackMode: process.env.RAG_FALLBACK_MODE !== 'false'
  }
};

export default config;
