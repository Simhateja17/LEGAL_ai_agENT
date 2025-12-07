#!/usr/bin/env node

/**
 * 04-upload-to-supabase.js
 * 
 * Uploads document chunks with embeddings to Supabase database:
 * - Inserts into insurance_chunks table
 * - Links to insurers and insurance_products
 * - Batch inserts for performance
 * - Progress tracking and error handling
 * 
 * Usage:
 *   node 04-upload-to-supabase.js --input data/processed/embeddings
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createTracker } from './utils/progress-tracker.js';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: 'data/processed/embeddings/chunks-with-embeddings.json',
    batchSize: 500,
    dryRun: false,
    clearExisting: false,
  };

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];

    if (flag === '--input') {
      options.input = value;
      i++;
    } else if (flag === '--batch-size') {
      options.batchSize = parseInt(value);
      i++;
    } else if (flag === '--dry-run') {
      options.dryRun = true;
    } else if (flag === '--clear') {
      options.clearExisting = true;
    }
  }

  return options;
}

/**
 * Initialize Supabase client
 */
function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in .env file');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Clear existing chunks (if requested)
 */
async function clearExistingChunks(supabase) {
  console.log('🗑️  Clearing existing chunks...');
  
  const { error } = await supabase
    .from('insurance_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) {
    throw new Error(`Failed to clear existing chunks: ${error.message}`);
  }

  console.log('✓ Existing chunks cleared\n');
}

/**
 * Upload chunks in batches
 */
async function uploadInBatches(supabase, chunks, batchSize, tracker) {
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

    // Prepare data for Supabase
    const records = batch.map(chunk => ({
      insurer_id: chunk.insurerId || null,
      product_id: chunk.productId || null, // Will be null if not linked
      chunk_text: chunk.chunkText,
      chunk_index: chunk.chunkIndex,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(chunk.embedding), // Supabase expects JSON string for vector
      metadata: chunk.metadata || {},
    }));

    try {
      const { data, error } = await supabase
        .from('insurance_chunks')
        .insert(records)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      successCount += batch.length;
      tracker.increment(batch.length);
    } catch (error) {
      failedCount += batch.length;
      tracker.logError(error, { 
        batchStart: i, 
        batchSize: batch.length,
        firstChunk: batch[0]?.chunkText?.substring(0, 50),
      });
      
      console.error(`\n❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
    }

    // Small delay between batches to avoid rate limits
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { successCount, failedCount };
}

/**
 * Get insurer mapping (if insurers exist in database)
 */
async function getInsurerMapping(supabase) {
  const { data, error } = await supabase
    .from('insurers')
    .select('id, name');

  if (error) {
    console.warn('⚠️  Could not load insurers from database');
    return {};
  }

  const mapping = {};
  for (const insurer of data || []) {
    mapping[insurer.name.toLowerCase()] = insurer.id;
  }

  return mapping;
}

/**
 * Link chunks to insurers based on metadata
 */
function linkChunksToInsurers(chunks, insurerMapping) {
  let linked = 0;

  for (const chunk of chunks) {
    // Try to find insurer ID from metadata
    const insurerName = chunk.metadata?.insurerName?.toLowerCase();
    if (insurerName && insurerMapping[insurerName]) {
      chunk.insurerId = insurerMapping[insurerName];
      linked++;
    }
  }

  return linked;
}

/**
 * Main execution
 */
async function main() {
  console.log('⬆️  Supabase Upload Pipeline\n');

  const options = parseArgs();

  console.log('Configuration:');
  console.log(`  Input: ${options.input}`);
  console.log(`  Batch size: ${options.batchSize}`);
  console.log(`  Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`  Clear existing: ${options.clearExisting ? 'Yes' : 'No'}`);
  console.log('');

  // Initialize Supabase
  console.log('🔌 Connecting to Supabase...');
  let supabase;
  try {
    supabase = initSupabase();
    console.log('✓ Connected to Supabase\n');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error('   Check SUPABASE_URL and SUPABASE_KEY in .env file');
    process.exit(1);
  }

  // Load chunks with embeddings
  console.log('📂 Loading chunks with embeddings...');
  let chunks;
  try {
    const content = await fs.readFile(options.input, 'utf-8');
    chunks = JSON.parse(content);
    console.log(`✓ Loaded ${chunks.length} chunks\n`);
  } catch (error) {
    console.error(`❌ Error: Could not load embeddings from ${options.input}`);
    console.error(`   ${error.message}`);
    console.error('   Run 03-generate-embeddings.js first');
    process.exit(1);
  }

  if (chunks.length === 0) {
    console.log('⚠️  No chunks to upload');
    process.exit(0);
  }

  // Get insurer mapping
  console.log('🏢 Loading insurer mapping...');
  const insurerMapping = await getInsurerMapping(supabase);
  const linkedCount = linkChunksToInsurers(chunks, insurerMapping);
  console.log(`✓ Linked ${linkedCount} chunks to insurers\n`);

  // Dry run - just show what would happen
  if (options.dryRun) {
    console.log('🔍 Dry Run Mode - No data will be uploaded\n');
    console.log(`Would upload ${chunks.length} chunks in ${Math.ceil(chunks.length / options.batchSize)} batches`);
    console.log(`Chunks with insurer links: ${linkedCount}`);
    console.log(`Chunks without links: ${chunks.length - linkedCount}`);
    
    // Show sample chunk
    if (chunks.length > 0) {
      console.log('\nSample chunk:');
      console.log(`  Text: "${chunks[0].chunkText.substring(0, 100)}..."`);
      console.log(`  Tokens: ${chunks[0].tokenCount}`);
      console.log(`  Embedding: [${chunks[0].embedding.slice(0, 3).join(', ')}, ...]`);
      console.log(`  Insurer ID: ${chunks[0].insurerId || 'null'}`);
    }
    
    process.exit(0);
  }

  // Clear existing chunks if requested
  if (options.clearExisting) {
    await clearExistingChunks(supabase);
  }

  // Estimate time
  const batches = Math.ceil(chunks.length / options.batchSize);
  const estimatedSeconds = batches * 2;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  console.log('📊 Estimates:');
  console.log(`  Batches: ${batches}`);
  console.log(`  Estimated time: ~${estimatedMinutes} minutes`);
  console.log('');

  // Create progress tracker
  const tracker = createTracker(
    chunks.length,
    'Uploading chunks',
    'scripts/data-processing/logs/upload.log'
  );

  // Upload chunks
  console.log('🚀 Starting upload...\n');
  const startTime = Date.now();

  const { successCount, failedCount } = await uploadInBatches(
    supabase,
    chunks,
    options.batchSize,
    tracker
  );

  // Complete progress tracking
  const summary = await tracker.complete();

  // Print results
  console.log('\n📊 Upload Results:');
  console.log(`  ✓ Successful: ${successCount}`);
  console.log(`  ✗ Failed: ${failedCount}`);
  console.log(`  📦 Total: ${chunks.length}`);

  // Verify upload in database
  console.log('\n🔍 Verifying upload...');
  const { count, error } = await supabase
    .from('insurance_chunks')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.warn(`⚠️  Could not verify upload: ${error.message}`);
  } else {
    console.log(`✓ Database contains ${count} chunks`);
  }

  // Save summary
  const summaryPath = 'scripts/data-processing/logs/upload-summary.json';
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const summaryData = {
    timestamp: new Date().toISOString(),
    totalChunks: chunks.length,
    successfulUploads: successCount,
    failedUploads: failedCount,
    linkedToInsurers: linkedCount,
    batchSize: options.batchSize,
    batches: batches,
    durationSeconds: duration,
    chunksPerSecond: (successCount / duration).toFixed(2),
    databaseCount: count || 0,
  };
  
  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2), 'utf-8');

  console.log('\n✅ Upload complete!');
  console.log(`   Successful: ${successCount}/${chunks.length}`);
  console.log(`   Summary: ${summaryPath}`);
  console.log(`   Log: scripts/data-processing/logs/upload.log`);
  console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);

  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
