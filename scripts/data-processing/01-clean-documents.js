#!/usr/bin/env node

/**
 * 01-clean-documents.js
 * 
 * Cleans raw insurance documents by:
 * - Removing HTML tags
 * - Fixing encoding issues
 * - Normalizing whitespace
 * - Removing special characters
 * - Cleaning insurance-specific formatting
 * 
 * Usage:
 *   node 01-clean-documents.js --input data/raw --output data/processed/clean
 */

import fs from 'fs/promises';
import path from 'path';
import { cleanText, validateText } from './utils/text-cleaner.js';
import { createTracker } from './utils/progress-tracker.js';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: 'data/raw',
    output: 'data/processed/clean',
    extensions: ['.txt', '.md', '.html'],
  };

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    if (flag === '--input') options.input = value;
    else if (flag === '--output') options.output = value;
    else if (flag === '--ext') options.extensions = value.split(',');
  }

  return options;
}

/**
 * Find all text files in directory recursively
 */
async function findTextFiles(dir, extensions) {
  const files = [];

  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Clean a single document file
 */
async function cleanDocument(inputPath, outputPath) {
  try {
    // Read raw content
    const rawContent = await fs.readFile(inputPath, 'utf-8');

    // Clean the text
    const cleanedText = cleanText(rawContent, {
      removeHtmlTags: true,
      fixEncodingIssues: true,
      normalizeSpaces: true,
      removeSpecialCharacters: true,
      cleanInsuranceFormat: true,
    });

    // Validate cleaned text
    const validation = validateText(cleanedText);

    // Create output directory if needed
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Write cleaned content
    await fs.writeFile(outputPath, cleanedText, 'utf-8');

    // Write validation report alongside
    const reportPath = outputPath.replace(/\.(txt|md|html)$/, '.validation.json');
    await fs.writeFile(reportPath, JSON.stringify(validation, null, 2), 'utf-8');

    return {
      success: true,
      inputPath,
      outputPath,
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
  console.log('🧹 Document Cleaning Pipeline\n');

  const options = parseArgs();

  console.log('Configuration:');
  console.log(`  Input:  ${options.input}`);
  console.log(`  Output: ${options.output}`);
  console.log(`  Extensions: ${options.extensions.join(', ')}`);
  console.log('');

  // Check input directory exists
  try {
    await fs.access(options.input);
  } catch (error) {
    console.error(`❌ Error: Input directory does not exist: ${options.input}`);
    console.error('   Create it or specify a different path with --input');
    process.exit(1);
  }

  // Find all text files
  console.log('📂 Scanning for documents...');
  const inputFiles = await findTextFiles(options.input, options.extensions);

  if (inputFiles.length === 0) {
    console.log('⚠️  No documents found to process.');
    console.log(`   Extensions: ${options.extensions.join(', ')}`);
    console.log(`   Check your input directory: ${options.input}`);
    process.exit(0);
  }

  console.log(`✓ Found ${inputFiles.length} documents\n`);

  // Create progress tracker
  const tracker = createTracker(
    inputFiles.length,
    'Cleaning documents',
    'scripts/data-processing/logs/cleaning.log'
  );

  // Process each document
  const results = [];

  for (const inputPath of inputFiles) {
    // Calculate output path (preserve directory structure)
    const relativePath = path.relative(options.input, inputPath);
    const outputPath = path.join(options.output, relativePath);

    // Clean document
    const result = await cleanDocument(inputPath, outputPath);
    results.push(result);

    // Track progress
    tracker.increment();

    // Log errors
    if (!result.success) {
      tracker.logError(new Error(result.error), { file: inputPath });
    }
  }

  // Complete progress tracking
  const summary = await tracker.complete();

  // Print summary
  console.log('\n📊 Cleaning Results:');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const warnings = successful.filter(r => r.validation && r.validation.warnings.length > 0);

  console.log(`  ✓ Successful: ${successful.length}`);
  console.log(`  ✗ Failed: ${failed.length}`);
  console.log(`  ⚠ Warnings: ${warnings.length}`);

  // Show failed documents
  if (failed.length > 0) {
    console.log('\n❌ Failed Documents:');
    failed.forEach(r => {
      console.log(`  - ${r.inputPath}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  // Show warnings
  if (warnings.length > 0 && warnings.length <= 10) {
    console.log('\n⚠️  Documents with Warnings:');
    warnings.forEach(r => {
      console.log(`  - ${r.inputPath}`);
      r.validation.warnings.forEach(w => {
        console.log(`    • ${w}`);
      });
    });
  } else if (warnings.length > 10) {
    console.log(`\n⚠️  ${warnings.length} documents have warnings (see validation.json files)`);
  }

  // Calculate statistics
  const totalChars = successful.reduce(
    (sum, r) => sum + (r.validation?.stats?.length || 0),
    0
  );
  const totalWords = successful.reduce(
    (sum, r) => sum + (r.validation?.stats?.words || 0),
    0
  );

  console.log('\n📈 Text Statistics:');
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  Total words: ${totalWords.toLocaleString()}`);
  console.log(`  Average words/document: ${Math.round(totalWords / successful.length)}`);

  console.log('\n✅ Cleaning complete!');
  console.log(`   Output: ${options.output}`);
  console.log(`   Log: scripts/data-processing/logs/cleaning.log`);

  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
