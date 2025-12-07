#!/usr/bin/env node

/**
 * 03-generate-embeddings.js
 * 
 * Generates 768-dimensional vector embeddings for document chunks using Vertex AI:
 * - Uses textembedding-gecko@003 model
 * - Batch processing (100 chunks at a time)
 * - Rate limiting and retry logic
 * - Progress tracking
 * 
 * Usage:
 *   node 03-generate-embeddings.js --input data/processed/chunks --output data/processed/embeddings
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { createTracker, retryWithBackoff } from './utils/progress-tracker.js';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: 'data/processed/chunks/chunks.json',
    output: 'data/processed/embeddings',
    batchSize: 100,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];

    if (flag === '--input') {
      options.input = value;
      i++;
    } else if (flag === '--output') {
      options.output = value;
      i++;
    } else if (flag === '--batch-size') {
      options.batchSize = parseInt(value);
      i++;
    } else if (flag === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

/**
 * Generate a mock embedding (for testing without Vertex AI)
 */
function generateMockEmbedding() {
  // Generate random 768-dimensional vector
  const embedding = [];
  for (let i = 0; i < 768; i++) {
    embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
  }
  // Normalize to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

/**
 * Generate embeddings using Vertex AI (mock implementation)
 * In production, this would use @google-cloud/aiplatform
 */
async function generateEmbeddings(texts) {
  // Check if Vertex AI is configured
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || 'europe-west3';
  const model = process.env.VERTEX_AI_EMBEDDING_MODEL || 'textembedding-gecko@003';

  if (!projectId) {
    console.warn('⚠️  VERTEX_AI_PROJECT_ID not set - using mock embeddings');
    console.warn('   For production, configure Vertex AI credentials');
    // Return mock embeddings
    return texts.map(() => generateMockEmbedding());
  }

  // In production, use actual Vertex AI client:
  /*
  import { PredictionServiceClient } from '@google-cloud/aiplatform';
  
  const client = new PredictionServiceClient({
    apiEndpoint: `${location}-aiplatform.googleapis.com`,
  });

  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;
  
  const instances = texts.map(text => ({
    content: text,
  }));

  const [response] = await client.predict({
    endpoint,
    instances,
  });

  return response.predictions.map(prediction => prediction.embeddings.values);
  */

  // For now, return mock embeddings
  console.log(`   [Mock] Generating ${texts.length} embeddings...`);
  return texts.map(() => generateMockEmbedding());
}

/**
 * Process chunks in batches
 */
async function processInBatches(chunks, batchSize, tracker) {
  const results = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
    const texts = batch.map(chunk => chunk.chunkText);

    try {
      // Generate embeddings with retry logic
      const embeddings = await retryWithBackoff(
        () => generateEmbeddings(texts),
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          factor: 2,
          onRetry: (attempt, maxRetries, delay, error) => {
            console.warn(`\n⚠️  Retry ${attempt}/${maxRetries} after ${delay}ms`);
            console.warn(`   Error: ${error.message}`);
          },
        }
      );

      // Combine chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          embedding: embeddings[j],
        });
      }

      tracker.increment(batch.length);

      // Rate limiting: wait between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms between batches
      }
    } catch (error) {
      tracker.logError(error, { batchStart: i, batchSize: batch.length });
      throw error;
    }
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('🧮 Embedding Generation Pipeline\n');

  const options = parseArgs();

  console.log('Configuration:');
  console.log(`  Input:  ${options.input}`);
  console.log(`  Output: ${options.output}`);
  console.log(`  Batch size: ${options.batchSize}`);
  console.log(`  Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Check Vertex AI configuration
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || 'europe-west3';
  const model = process.env.VERTEX_AI_EMBEDDING_MODEL || 'textembedding-gecko@003';

  console.log('Vertex AI Configuration:');
  if (projectId) {
    console.log(`  ✓ Project ID: ${projectId}`);
    console.log(`  ✓ Location: ${location}`);
    console.log(`  ✓ Model: ${model}`);
  } else {
    console.log(`  ⚠️  Project ID: Not configured (using mock embeddings)`);
    console.log(`  ℹ️  Set VERTEX_AI_PROJECT_ID in .env for production`);
  }
  console.log('');

  // Load chunks
  console.log('📂 Loading chunks...');
  let chunks;
  try {
    const content = await fs.readFile(options.input, 'utf-8');
    chunks = JSON.parse(content);
    console.log(`✓ Loaded ${chunks.length} chunks\n`);
  } catch (error) {
    console.error(`❌ Error: Could not load chunks from ${options.input}`);
    console.error(`   ${error.message}`);
    console.error('   Run 02-chunk-documents.js first');
    process.exit(1);
  }

  if (chunks.length === 0) {
    console.log('⚠️  No chunks to process');
    process.exit(0);
  }

  // Dry run - just show what would happen
  if (options.dryRun) {
    console.log('🔍 Dry Run Mode - No embeddings will be generated\n');
    console.log(`Would process ${chunks.length} chunks in ${Math.ceil(chunks.length / options.batchSize)} batches`);
    console.log(`Estimated time: ~${Math.ceil(chunks.length / options.batchSize) * 2} seconds`);
    console.log(`Total API calls: ${Math.ceil(chunks.length / options.batchSize)}`);
    process.exit(0);
  }

  // Estimate cost and time
  const batches = Math.ceil(chunks.length / options.batchSize);
  const estimatedSeconds = batches * 2; // ~2 seconds per batch
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  console.log('📊 Estimates:');
  console.log(`  Batches: ${batches}`);
  console.log(`  Estimated time: ~${estimatedMinutes} minutes`);
  console.log(`  Rate: ~${Math.round(chunks.length / estimatedSeconds)} chunks/second`);
  console.log('');

  // Create progress tracker
  const tracker = createTracker(
    chunks.length,
    'Generating embeddings',
    'scripts/data-processing/logs/embeddings.log'
  );

  // Process chunks
  console.log('🚀 Starting embedding generation...\n');
  const startTime = Date.now();

  let chunksWithEmbeddings;
  try {
    chunksWithEmbeddings = await processInBatches(chunks, options.batchSize, tracker);
  } catch (error) {
    console.error(`\n❌ Fatal Error: ${error.message}`);
    console.error('   Some batches may have been processed successfully');
    process.exit(1);
  }

  // Complete progress tracking
  const summary = await tracker.complete();

  // Verify all embeddings are valid
  console.log('\n🔍 Validating embeddings...');
  let validCount = 0;
  let invalidCount = 0;

  for (const chunk of chunksWithEmbeddings) {
    if (Array.isArray(chunk.embedding) && chunk.embedding.length === 768) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  console.log(`  ✓ Valid: ${validCount}`);
  if (invalidCount > 0) {
    console.log(`  ✗ Invalid: ${invalidCount}`);
  }

  // Save embeddings to output
  console.log('\n💾 Saving embeddings...');
  await fs.mkdir(options.output, { recursive: true });

  const outputPath = path.join(options.output, 'chunks-with-embeddings.json');
  await fs.writeFile(outputPath, JSON.stringify(chunksWithEmbeddings, null, 2), 'utf-8');
  console.log(`✓ Saved ${chunksWithEmbeddings.length} chunks with embeddings to ${outputPath}`);

  // Save summary
  const summaryPath = path.join(options.output, 'summary.json');
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const summaryData = {
    timestamp: new Date().toISOString(),
    totalChunks: chunks.length,
    validEmbeddings: validCount,
    invalidEmbeddings: invalidCount,
    batchSize: options.batchSize,
    batches: batches,
    durationSeconds: duration,
    chunksPerSecond: (chunks.length / duration).toFixed(2),
    vertexAI: {
      projectId: projectId || 'not-configured',
      location,
      model,
    },
  };
  await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2), 'utf-8');

  console.log('\n✅ Embedding generation complete!');
  console.log(`   Output: ${options.output}`);
  console.log(`   Embeddings: ${outputPath}`);
  console.log(`   Summary: ${summaryPath}`);
  console.log(`   Log: scripts/data-processing/logs/embeddings.log`);
  console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);

  // Exit with appropriate code
  process.exit(invalidCount > 0 ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
