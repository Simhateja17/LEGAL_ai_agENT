import { createEmbedding } from './embedding.service.js';
import { callLLM } from './llm.service.js';
import supabase from '../db/supabase.js';
import { withTimeout } from '../utils/timeout.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';

/**
 * RAG Pipeline - Retrieval-Augmented Generation
 * Orchestrates embedding generation, vector search, and LLM calls
 * Implements timeout and retry patterns for robust AI operations
 */
export async function runRagPipeline(question) {
  try {
    // Step 1: Generate embedding for the question with timeout (10s)
    console.log('Step 1: Generating embedding for question...');
    const embedding = await withTimeout(
      createEmbedding(question),
      10000,
      'Embedding generation timed out'
    );

    // Step 2: Query Supabase/pgvector for similar chunks with retry
    console.log('Step 2: Searching for relevant documents...');
    const relevantChunks = await retryWithBackoff(
      async () => {
        const { data, error } = await supabase.rpc('match_documents', {
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: 5
        });

        if (error) throw error;
        return data || [];
      },
      {
        maxRetries: 2,
        initialDelay: 500,
        shouldRetry: isRetryableError
      }
    );

    // Step 3: Build prompt with context
    console.log(`Step 3: Building prompt with ${relevantChunks.length} relevant chunks...`);
    const context = relevantChunks
      .map(chunk => chunk.chunk_text)
      .join('\n\n');

    const prompt = `You are an expert on German insurance. Answer the following question based on the provided context.

Context:
${context || 'No specific context available.'}

Question: ${question}

Answer:`;

    // Step 4: Call LLM with timeout and retry (30s timeout)
    console.log('Step 4: Generating answer with LLM...');
    const answer = await withTimeout(
      retryWithBackoff(
        async () => callLLM(prompt),
        {
          maxRetries: 2,
          initialDelay: 1000,
          shouldRetry: isRetryableError
        }
      ),
      30000,
      'LLM generation timed out'
    );

    return {
      answer,
      sources: relevantChunks.map(chunk => ({
        text: chunk.chunk_text.substring(0, 200) + '...',
        similarity: chunk.similarity
      }))
    };

  } catch (error) {
    console.error('RAG Pipeline error:', error.message);
    
    // Graceful degradation - return helpful error message
    if (error.name === 'TimeoutError') {
      throw error;
    }
    
    // For other errors, provide fallback
    throw new Error(`Unable to process question: ${error.message}`);
  }
}
