#!/usr/bin/env node

/**
 * 02-chunk-documents.js
 * 
 * Chunks cleaned documents into smaller pieces suitable for embedding:
 * - Target: 800 tokens per chunk
 * - Overlap: 75 tokens between chunks
 * - Preserves sentence boundaries
 * - Maintains document metadata
 * 
 * Usage:
 *   node 02-chunk-documents.js --input data/processed/clean --output data/processed/chunks
 */

import fs from 'fs/promises';
import path from 'path';
import { chunkDocument, validateChunks } from './utils/chunker.js';
import { createTracker } from './utils/progress-tracker.js';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: 'data/processed/clean',
    output: 'data/processed/chunks',
    metadataFile: 'data/raw/metadata.json',
    targetTokens: 800,
    overlapTokens: 75,
  };

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    if (flag === '--input') options.input = value;
    else if (flag === '--output') options.output = value;
    else if (flag === '--metadata') options.metadataFile = value;
    else if (flag === '--target-tokens') options.targetTokens = parseInt(value);
    else if (flag === '--overlap-tokens') options.overlapTokens = parseInt(value);
  }

  return options;
}

/**
 * Load metadata file
 */
async function loadMetadata(metadataPath) {
  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Could not load metadata from ${metadataPath}`);
    console.warn(`   Using default metadata. Error: ${error.message}`);
    return null;
  }
}

/**
 * Find all cleaned text files
 */
async function findCleanedFiles(dir) {
  const files = [];

  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        // Skip validation files
        if (!entry.name.endsWith('.validation.json')) {
          files.push(fullPath);
        }
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Get metadata for a document based on its path
 */
function getDocumentMetadata(filePath, metadata) {
  if (!metadata) {
    return {
      documentId: null,
      insurerId: null,
      title: path.basename(filePath),
      insuranceType: null,
      documentType: null,
      sourceUrl: null,
    };
  }

  // Try to match document by filename
  const filename = path.basename(filePath);
  
  // Search through metadata
  for (const insurer of metadata.insurers || []) {
    for (const doc of insurer.documents || []) {
      if (doc.filename === filename || doc.filename === filename.replace(/\.(txt|md|html)$/, '')) {
        return {
          documentId: doc.id || null,
          insurerId: insurer.id || null,
          title: doc.title || filename,
          insuranceType: doc.insuranceType || doc.insurance_type || null,
          documentType: doc.documentType || doc.document_type || null,
          sourceUrl: doc.sourceUrl || doc.source_url || null,
        };
      }
    }
  }

  // Default metadata if not found
  return {
    documentId: null,
    insurerId: null,
    title: filename,
    insuranceType: null,
    documentType: null,
    sourceUrl: null,
  };
}

/**
 * Chunk a single document
 */
async function chunkDocumentFile(inputPath, metadata, options) {
  try {
    // Read cleaned content
    const text = await fs.readFile(inputPath, 'utf-8');

    if (!text || text.trim().length === 0) {
      throw new Error('Empty document');
    }

    // Get document metadata
    const docMetadata = getDocumentMetadata(inputPath, metadata);

    // Create document object
    const document = {
      text,
      ...docMetadata,
    };

    // Chunk the document
    const chunks = chunkDocument(document, {
      targetTokens: options.targetTokens,
      overlapTokens: options.overlapTokens,
      minTokens: 100,
      maxTokens: 1000,
    });

    // Validate chunks
    const validation = validateChunks(chunks);

    return {
      success: true,
      inputPath,
      chunks,
      validation,
    };
  } catch (error) {
    return {
      success: false,
      inputPath,
      error: error.message,
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('📄 Document Chunking Pipeline\n');

  const options = parseArgs();

  console.log('Configuration:');
  console.log(`  Input:  ${options.input}`);
  console.log(`  Output: ${options.output}`);
  console.log(`  Target tokens: ${options.targetTokens}`);
  console.log(`  Overlap tokens: ${options.overlapTokens}`);
  console.log('');

  // Check input directory exists
  try {
    await fs.access(options.input);
  } catch (error) {
    console.error(`❌ Error: Input directory does not exist: ${options.input}`);
    console.error('   Run 01-clean-documents.js first');
    process.exit(1);
  }

  // Load metadata
  console.log('📋 Loading metadata...');
  const metadata = await loadMetadata(options.metadataFile);
  if (metadata) {
    console.log(`✓ Loaded metadata for ${metadata.insurers?.length || 0} insurers\n`);
  } else {
    console.log('✓ Using default metadata\n');
  }

  // Find all cleaned files
  console.log('📂 Scanning for documents...');
  const inputFiles = await findCleanedFiles(options.input);

  if (inputFiles.length === 0) {
    console.log('⚠️  No cleaned documents found.');
    console.log(`   Check your input directory: ${options.input}`);
    process.exit(0);
  }

  console.log(`✓ Found ${inputFiles.length} documents\n`);

  // Create progress tracker
  const tracker = createTracker(
    inputFiles.length,
    'Chunking documents',
    'scripts/data-processing/logs/chunking.log'
  );

  // Process each document
  const results = [];
  let allChunks = [];

  for (const inputPath of inputFiles) {
    // Chunk document
    const result = await chunkDocumentFile(inputPath, metadata, options);
    results.push(result);

    // Track progress
    tracker.increment();

    // Log errors
    if (!result.success) {
      tracker.logError(new Error(result.error), { file: inputPath });
    } else {
      allChunks.push(...result.chunks);
    }
  }

  // Complete progress tracking
  const summary = await tracker.complete();

  // Print summary
  console.log('\n📊 Chunking Results:');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const warnings = successful.filter(r => r.validation && r.validation.warnings.length > 0);

  console.log(`  ✓ Successful: ${successful.length}`);
  console.log(`  ✗ Failed: ${failed.length}`);
  console.log(`  ⚠ Warnings: ${warnings.length}`);
  console.log(`  📦 Total chunks: ${allChunks.length}`);

  // Show failed documents
  if (failed.length > 0) {
    console.log('\n❌ Failed Documents:');
    failed.forEach(r => {
      console.log(`  - ${r.inputPath}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  // Calculate statistics
  const avgChunksPerDoc = successful.length > 0 ? (allChunks.length / successful.length).toFixed(1) : 0;
  const avgTokensPerChunk = allChunks.length > 0 
    ? Math.round(allChunks.reduce((sum, c) => sum + c.tokenCount, 0) / allChunks.length)
    : 0;

  console.log('\n📈 Chunk Statistics:');
  console.log(`  Total chunks: ${allChunks.length}`);
  console.log(`  Average chunks/document: ${avgChunksPerDoc}`);
  console.log(`  Average tokens/chunk: ${avgTokensPerChunk}`);
  console.log(`  Total tokens: ${allChunks.reduce((sum, c) => sum + c.tokenCount, 0).toLocaleString()}`);

  // Save chunks to output
  console.log('\n💾 Saving chunks...');
  const outputPath = path.join(options.output, 'chunks.json');
  await fs.mkdir(options.output, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(allChunks, null, 2), 'utf-8');
  console.log(`✓ Saved ${allChunks.length} chunks to ${outputPath}`);

  // Save summary
  const summaryPath = path.join(options.output, 'summary.json');
  const summaryData = {
    timestamp: new Date().toISOString(),
    documentsProcessed: successful.length,
    documentsFailed: failed.length,
    totalChunks: allChunks.length,
    averageChunksPerDocument: parseFloat(avgChunksPerDoc),
    averageTokensPerChunk: avgTokensPerChunk,
    configuration: {
      targetTokens: options.targetTokens,
      overlapTokens: options.overlapTokens,
    },
  };
  await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2), 'utf-8');

  console.log('\n✅ Chunking complete!');
  console.log(`   Output: ${options.output}`);
  console.log(`   Chunks: ${outputPath}`);
  console.log(`   Summary: ${summaryPath}`);
  console.log(`   Log: scripts/data-processing/logs/chunking.log`);

  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
