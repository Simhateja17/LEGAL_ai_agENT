/**
 * Embedding Service
 * Handles text embedding generation for vector search using Azure OpenAI
 * 
 * Uses text-embedding-3-small model (1536 dimensions)
 * Supports fallback mode for testing without Azure credentials
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';

// Azure OpenAI configuration
const AZURE_CONFIG = {
  endpoint: config.azureOpenAI?.endpoint,
  apiKey: config.azureOpenAI?.apiKey,
  deployment: config.azureOpenAI?.embedding?.deployment || 'text-embedding-3-small',
  apiVersion: config.azureOpenAI?.embedding?.apiVersion || '2023-05-15',
  dimension: config.azureOpenAI?.embedding?.dimension || 1536
};

// Track if we're in fallback mode
let useFallbackMode = !AZURE_CONFIG.endpoint || !AZURE_CONFIG.apiKey || config.rag?.fallbackMode;

/**
 * Generate a deterministic fallback embedding for testing
 * Creates a consistent 1536-dim vector based on text content
 * @param {string} text - Input text
 * @returns {number[]} 1536-dimensional embedding vector
 */
function generateFallbackEmbedding(text) {
  const dimension = AZURE_CONFIG.dimension;
  const embedding = new Array(dimension).fill(0);
  
  // Create a deterministic but varied embedding based on text
  const normalizedText = text.toLowerCase().trim();
  
  for (let i = 0; i < normalizedText.length && i < dimension; i++) {
    const charCode = normalizedText.charCodeAt(i);
    const position = i % dimension;
    
    // Create variation based on character position and value
    embedding[position] += (charCode / 255) * Math.cos(i * 0.1);
    embedding[(position + 1) % dimension] += (charCode / 255) * Math.sin(i * 0.1);
  }
  
  // Add semantic hints for German legal terms (adjusted for 1536 dimensions)
  const legalTerms = {
    // BGB - Civil Code (0-150)
    'bgb': [0, 100],
    'bürgerliches': [0, 100],
    'zivilrecht': [0, 100],
    'kaufvertrag': [100, 200],
    '433': [100, 200],
    'kauf': [100, 200],
    'verkäufer': [100, 200],
    'käufer': [100, 200],
    
    // Schadensersatz (200-350)
    'schadensersatz': [200, 300],
    'schaden': [200, 300],
    '823': [200, 300],
    'haftung': [200, 300],
    'deliktsrecht': [200, 300],
    
    // Mietrecht (400-500)
    'miete': [400, 500],
    'mietvertrag': [400, 500],
    'mieter': [400, 500],
    'vermieter': [400, 500],
    '535': [400, 500],
    'wohnung': [400, 500],
    
    // Strafrecht (600-750)
    'stgb': [600, 700],
    'strafrecht': [600, 700],
    'strafe': [600, 700],
    'körperverletzung': [650, 750],
    '223': [650, 750],
    'diebstahl': [700, 800],
    '242': [700, 800],
    
    // Grundgesetz (800-950)
    'grundgesetz': [800, 900],
    'gg': [800, 900],
    'verfassung': [800, 900],
    'grundrecht': [850, 950],
    'menschenwürde': [850, 950],
    
    // Arbeitsrecht (1000-1100)
    'arbeitsrecht': [1000, 1100],
    'kündigung': [1000, 1100],
    'kündigungsschutz': [1000, 1100],
    'arbeitnehmer': [1000, 1100],
    
    // Erbrecht (1100-1200)
    'erbrecht': [1100, 1200],
    'erbe': [1100, 1200],
    'testament': [1100, 1200],
    '1922': [1100, 1200],
    
    // Versicherungsrecht (1200-1350)
    'versicherung': [1200, 1300],
    'versicherungsvertrag': [1200, 1300],
    'vvg': [1200, 1300],
    'police': [1250, 1350],
    'prämie': [1250, 1350],
    'leistung': [1250, 1350],
    
    // General legal terms (1350-1536)
    'gesetz': [1350, 1450],
    'paragraph': [1350, 1450],
    'recht': [1400, 1500],
    'anspruch': [1400, 1500],
    'pflicht': [1450, 1536]
  };
  
  for (const [term, [start, end]] of Object.entries(legalTerms)) {
    if (normalizedText.includes(term)) {
      for (let i = start; i < end && i < dimension; i++) {
        embedding[i] += 0.5;
      }
    }
  }
  
  // Normalize the embedding vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Call Azure OpenAI embedding API
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector (1536 dimensions)
 */
async function callAzureEmbedding(text) {
  if (useFallbackMode) {
    return generateFallbackEmbedding(text);
  }

  try {
    // Azure OpenAI Embeddings endpoint
    const endpoint = `${AZURE_CONFIG.endpoint}openai/deployments/${AZURE_CONFIG.deployment}/embeddings?api-version=${AZURE_CONFIG.apiVersion}`;
    
    logger.debug('Calling Azure OpenAI embedding API', { 
      deployment: AZURE_CONFIG.deployment,
      textLength: text.length 
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': AZURE_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data[0] && data.data[0].embedding) {
      return data.data[0].embedding;
    }
    
    throw new Error('Unexpected response format from Azure OpenAI');
  } catch (error) {
    logger.error('Azure OpenAI embedding call failed', { error: error.message });
    
    // Fall back to mock embedding on error if fallback mode enabled
    if (config.rag?.fallbackMode) {
      logger.warn('Using fallback embedding due to API error');
      return generateFallbackEmbedding(text);
    }
    
    throw error;
  }
}

/**
 * Generate embedding for a single text
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<number[]>} 1536-dimensional embedding vector
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    throw new Error('Text cannot be empty or whitespace only');
  }

  // Truncate if too long (Azure OpenAI limit ~8192 tokens)
  const maxLength = 8000; // Approximate character limit
  const processedText = trimmedText.length > maxLength 
    ? trimmedText.substring(0, maxLength) 
    : trimmedText;

  const startTime = Date.now();
  
  try {
    const embedding = await callAzureEmbedding(processedText);
    
    logger.debug('Embedding generated', {
      textLength: processedText.length,
      embeddingDimension: embedding.length,
      durationMs: Date.now() - startTime,
      mode: useFallbackMode ? 'fallback' : 'azure-openai'
    });

    return embedding;
  } catch (error) {
    logger.error('Failed to generate embedding', {
      textLength: processedText.length,
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts with rate limiting
 * @param {string[]} texts - Array of texts to embed
 * @param {number} batchSize - Optional batch size (default from config)
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateBatchEmbeddings(texts, batchSize = VERTEX_CONFIG.maxBatchSize) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  const results = [];
  const delayMs = VERTEX_CONFIG.rateLimit.delayMs;
  
  logger.info('Starting batch embedding generation', {
    totalTexts: texts.length,
    batchSize
  });

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    
    results.push(...batchResults);
    
    // Rate limiting delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    logger.debug('Batch processed', {
      processed: Math.min(i + batchSize, texts.length),
      total: texts.length
    });
  }

  logger.info('Batch embedding generation complete', {
    totalTexts: texts.length,
    successCount: results.length
  });

  return results;
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param {number[]} embedding1 - First embedding vector
 * @param {number[]} embedding2 - Second embedding vector
 * @returns {number} Similarity score between -1 and 1
 */
function cosineSimilarity(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

/**
 * Get embedding service information
 * @returns {Object} Service configuration and status
 */
function getEmbeddingServiceInfo() {
  return {
    provider: useFallbackMode ? 'fallback' : 'azure-openai',
    deployment: AZURE_CONFIG.deployment,
    dimension: AZURE_CONFIG.dimension,
    endpoint: AZURE_CONFIG.endpoint ? AZURE_CONFIG.endpoint.substring(0, 30) + '...' : 'not-configured',
    apiVersion: AZURE_CONFIG.apiVersion,
    fallbackMode: useFallbackMode
  };
}

// Legacy alias for backward compatibility
const createEmbedding = generateEmbedding;

export {
  generateEmbedding,
  generateBatchEmbeddings,
  createEmbedding,
  cosineSimilarity,
  getEmbeddingServiceInfo,
  AZURE_CONFIG
};

export default {
  generateEmbedding,
  generateBatchEmbeddings,
  createEmbedding,
  cosineSimilarity,
  getEmbeddingServiceInfo,
  AZURE_CONFIG
};
