#!/usr/bin/env node

/**
 * Test Data Processing Pipeline
 * 
 * Tests the complete data ingestion pipeline with sample insurance documents.
 * This script demonstrates all steps without requiring external API connections.
 * 
 * Usage: node scripts/test-pipeline.js
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

console.log('🧪 Testing Data Processing Pipeline\n');
console.log('='.repeat(60));
console.log('This test will:');
console.log('  1. Clean 3 sample insurance documents');
console.log('  2. Chunk documents into 800-token chunks');
console.log('  3. Generate mock embeddings (768-dimensional vectors)');
console.log('  4. Display pipeline statistics');
console.log('='.repeat(60));
console.log('');

/**
 * Run a command and display output
 */
function runCommand(label, command) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    return true;
  } catch (error) {
    console.error(`\n❌ Command failed: ${command}`);
    return false;
  }
}

/**
 * Load and display JSON file
 */
async function displayJSON(filePath, label) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    console.log(`\n📄 ${label}:`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`\n⚠️  Could not load ${label}: ${error.message}`);
  }
}

/**
 * Main test execution
 */
async function main() {
  const startTime = Date.now();

  // Step 1: Clean documents
  const step1Success = runCommand(
    '📝 Step 1: Cleaning Documents',
    'node scripts/data-processing/01-clean-documents.js --input data/raw --output data/processed/clean'
  );

  if (!step1Success) {
    console.error('\n❌ Pipeline test failed at Step 1');
    process.exit(1);
  }

  // Step 2: Chunk documents
  const step2Success = runCommand(
    '✂️ Step 2: Chunking Documents',
    'node scripts/data-processing/02-chunk-documents.js --input data/processed/clean --output data/processed/chunks --metadata data/raw/metadata.json'
  );

  if (!step2Success) {
    console.error('\n❌ Pipeline test failed at Step 2');
    process.exit(1);
  }

  // Step 3: Generate embeddings
  const step3Success = runCommand(
    '🧮 Step 3: Generating Embeddings (Mock)',
    'node scripts/data-processing/03-generate-embeddings.js --input data/processed/chunks/chunks.json --output data/processed/embeddings'
  );

  if (!step3Success) {
    console.error('\n❌ Pipeline test failed at Step 3');
    process.exit(1);
  }

  // Display summaries
  console.log('\n' + '='.repeat(60));
  console.log('📊 Pipeline Results Summary');
  console.log('='.repeat(60));

  await displayJSON('data/processed/chunks/summary.json', 'Chunking Summary');
  await displayJSON('data/processed/embeddings/summary.json', 'Embedding Summary');

  // Display sample chunk with embedding
  try {
    const chunksContent = await fs.readFile('data/processed/embeddings/chunks-with-embeddings.json', 'utf-8');
    const chunks = JSON.parse(chunksContent);
    
    if (chunks.length > 0) {
      console.log('\n📄 Sample Chunk with Embedding:');
      console.log('');
      console.log(`Text: "${chunks[0].chunkText.substring(0, 200)}..."`);
      console.log(`Tokens: ${chunks[0].tokenCount}`);
      console.log(`Chunk Index: ${chunks[0].chunkIndex}`);
      console.log(`Insurer ID: ${chunks[0].insurerId || 'null'}`);
      console.log(`Embedding: [${chunks[0].embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...] (768 dimensions)`);
      console.log(`Metadata:`, JSON.stringify(chunks[0].metadata, null, 2));
    }
  } catch (error) {
    console.log(`\n⚠️  Could not load sample chunk: ${error.message}`);
  }

  // Final statistics
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Pipeline Test Complete!');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration} seconds`);
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Configure Vertex AI credentials in .env for production embeddings');
  console.log('  2. Ensure Supabase is set up (run: node test-connection.js)');
  console.log('  3. Upload chunks to database (run: npm run process:upload)');
  console.log('  4. Test RAG queries through the API');
  console.log('');
  console.log('Files created:');
  console.log('  - data/processed/clean/ (cleaned documents)');
  console.log('  - data/processed/chunks/chunks.json (document chunks)');
  console.log('  - data/processed/embeddings/chunks-with-embeddings.json (chunks with vectors)');
  console.log('');
}

// Run the test
main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
