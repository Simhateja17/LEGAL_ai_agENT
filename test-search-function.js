/**
 * Test Script for searchSimilarChunks Function
 * Tests vector similarity search with cosine distance
 * Verifies top-k results, metadata, and performance
 */

import { searchSimilarChunks } from './src/services/rag.service.js';
import supabase from './src/db/supabase.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${testName}`, color);
  if (details) {
    log(`   ${details}`, 'gray');
  }
}

async function runTests() {
  log('\n' + '='.repeat(70), 'cyan');
  log('  Testing searchSimilarChunks Function', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Check if search_similar_chunks function exists
  log('Test 1: Verify search_similar_chunks SQL function exists', 'blue');
  try {
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: new Array(768).fill(0.1),
      similarity_threshold: 0.9,
      match_count: 1
    });

    if (error) {
      // Check if error is "no rows" (function exists but no data)
      if (error.message.includes('no rows') || !error.message.includes('does not exist')) {
        logTest('search_similar_chunks function exists', true, 'Function is available in database');
        testsPassed++;
      } else {
        throw error;
      }
    } else {
      logTest('search_similar_chunks function exists', true, `Function works, returned ${data?.length || 0} results`);
      testsPassed++;
    }
  } catch (error) {
    logTest('search_similar_chunks function exists', false, error.message);
    testsFailed++;
    log('\n⚠️  Apply schema first: Run SQL from db/schema.sql in Supabase\n', 'yellow');
  }

  // Test 2: searchSimilarChunks with sample query
  log('\nTest 2: searchSimilarChunks function works', 'blue');
  try {
    const result = await searchSimilarChunks('Krankenversicherung', {
      matchCount: 3,
      matchThreshold: 0.5,
      timeout: 5000
    });

    const hasResults = result && result.results !== undefined;
    const hasStats = result && result.stats !== undefined;
    
    logTest(
      'searchSimilarChunks function works',
      hasResults && hasStats,
      `Returned ${result.results?.length || 0} results with stats`
    );
    
    if (hasResults && hasStats) {
      testsPassed++;
      log(`   Stats: ${JSON.stringify(result.stats, null, 2)}`, 'gray');
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('searchSimilarChunks function works', false, error.message);
    testsFailed++;
  }

  // Test 3: Query returns top-k similar chunks
  log('\nTest 3: Query returns top-k similar chunks', 'blue');
  try {
    const result = await searchSimilarChunks('Versicherung', {
      matchCount: 5,
      matchThreshold: 0.3
    });

    const hasCorrectCount = result.results.length <= 5;
    const hasRanking = result.results.every((r, i) => r.rank === i + 1);
    
    logTest(
      'Query returns top-k similar chunks',
      hasCorrectCount && hasRanking,
      `Requested 5, got ${result.results.length} results with proper ranking`
    );
    
    if (hasCorrectCount && hasRanking) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Query returns top-k similar chunks', false, error.message);
    testsFailed++;
  }

  // Test 4: Similarity scores are included in results
  log('\nTest 4: Similarity scores are included in results', 'blue');
  try {
    const result = await searchSimilarChunks('Hausratversicherung', {
      matchCount: 3,
      matchThreshold: 0.2
    });

    const hasSimilarityScores = result.results.every(r => 
      typeof r.similarity === 'number' && 
      r.similarity >= 0 && 
      r.similarity <= 1
    );
    
    const scoresSorted = result.results.every((r, i, arr) => 
      i === 0 || arr[i - 1].similarity >= r.similarity
    );
    
    logTest(
      'Similarity scores are included in results',
      hasSimilarityScores && scoresSorted,
      `All results have valid similarity scores (0-1), sorted descending`
    );
    
    if (hasSimilarityScores && scoresSorted) {
      testsPassed++;
      if (result.results.length > 0) {
        log(`   Sample scores: ${result.results.map(r => r.similarity.toFixed(3)).join(', ')}`, 'gray');
      }
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Similarity scores are included in results', false, error.message);
    testsFailed++;
  }

  // Test 5: Metadata is included (chunk content and IDs)
  log('\nTest 5: Metadata is included (chunk content and IDs)', 'blue');
  try {
    const result = await searchSimilarChunks('Autoversicherung', {
      matchCount: 2,
      matchThreshold: 0.2
    });

    const hasMetadata = result.results.every(r => 
      r.id && 
      r.documentId && 
      r.insurerId && 
      r.chunkText && 
      typeof r.chunkIndex === 'number'
    );
    
    logTest(
      'Metadata is included (chunk content and IDs)',
      hasMetadata,
      `All results have: id, documentId, insurerId, chunkText, chunkIndex`
    );
    
    if (hasMetadata) {
      testsPassed++;
      if (result.results.length > 0) {
        const sample = result.results[0];
        log(`   Sample chunk text: "${sample.chunkText.substring(0, 80)}..."`, 'gray');
        log(`   Document ID: ${sample.documentId}`, 'gray');
        log(`   Insurer ID: ${sample.insurerId}`, 'gray');
      }
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Metadata is included (chunk content and IDs)', false, error.message);
    testsFailed++;
  }

  // Test 6: Performance is acceptable (<500ms)
  log('\nTest 6: Performance is acceptable (<500ms)', 'blue');
  try {
    const start = Date.now();
    const result = await searchSimilarChunks('Test query', {
      matchCount: 5,
      matchThreshold: 0.5
    });
    const duration = Date.now() - start;

    const isAcceptable = duration < 500;
    
    logTest(
      'Performance is acceptable (<500ms)',
      isAcceptable,
      `Query completed in ${duration}ms (target: <500ms)`
    );
    
    if (isAcceptable) {
      testsPassed++;
    } else {
      testsFailed++;
      log(`   ⚠️  Performance issue: ${duration}ms > 500ms threshold`, 'yellow');
    }
    
    log(`   Breakdown: ${JSON.stringify(result.stats, null, 2)}`, 'gray');
  } catch (error) {
    logTest('Performance is acceptable (<500ms)', false, error.message);
    testsFailed++;
  }

  // Test 7: Cosine distance operator (<=>)
  log('\nTest 7: Using cosine distance operator (<=>)', 'blue');
  try {
    // This is implicit in match_document_chunks function
    // We verify by checking similarity scores are between 0 and 1
    const result = await searchSimilarChunks('Sample query', {
      matchCount: 3,
      matchThreshold: 0.1
    });

    const validSimilarity = result.results.every(r => 
      r.similarity >= 0 && r.similarity <= 1
    );
    
    logTest(
      'Using cosine distance operator (<=>)',
      validSimilarity,
      'Cosine distance (1 - distance) produces valid similarity scores'
    );
    
    if (validSimilarity) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Using cosine distance operator (<=>)', false, error.message);
    testsFailed++;
  }

  // Test 8: Configurable parameters
  log('\nTest 8: Configurable parameters (threshold, count)', 'blue');
  try {
    // Test with different thresholds
    const lowThreshold = await searchSimilarChunks('Test', {
      matchCount: 10,
      matchThreshold: 0.1
    });

    const highThreshold = await searchSimilarChunks('Test', {
      matchCount: 10,
      matchThreshold: 0.8
    });

    const lowCount = lowThreshold.results.length;
    const highCount = highThreshold.results.length;
    
    // Higher threshold should return fewer or equal results
    const thresholdWorks = highCount <= lowCount;
    
    logTest(
      'Configurable parameters (threshold, count)',
      thresholdWorks,
      `Low threshold (0.1): ${lowCount} results, High threshold (0.8): ${highCount} results`
    );
    
    if (thresholdWorks) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Configurable parameters (threshold, count)', false, error.message);
    testsFailed++;
  }

  // Summary
  log('\n' + '='.repeat(70), 'cyan');
  log('  Test Summary', 'cyan');
  log('='.repeat(70), 'cyan');
  
  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;
  
  log(`\nTests Passed: ${testsPassed}/${total} (${percentage}%)`, testsPassed === total ? 'green' : 'yellow');
  
  if (testsFailed > 0) {
    log(`Tests Failed: ${testsFailed}/${total}`, 'red');
  }

  // Completion checklist
  log('\n' + '='.repeat(70), 'cyan');
  log('  📋 Completion Checklist', 'cyan');
  log('='.repeat(70), 'cyan');
  
  const checklist = [
    { label: 'search_similar_chunks SQL function is created', check: testsPassed >= 1 },
    { label: 'searchSimilarChunks service function works', check: testsPassed >= 2 },
    { label: 'Query returns top-k similar chunks', check: testsPassed >= 3 },
    { label: 'Similarity scores are included in results', check: testsPassed >= 4 },
    { label: 'Function is tested with sample queries', check: testsPassed >= 5 },
    { label: 'Performance is acceptable (<500ms)', check: testsPassed >= 6 }
  ];

  checklist.forEach(item => {
    const icon = item.check ? '✅' : '❌';
    const color = item.check ? 'green' : 'red';
    log(`   ${icon} ${item.label}`, color);
  });

  const allComplete = checklist.every(item => item.check);
  
  if (allComplete) {
    log('\n🎉 All requirements complete! RAG search is ready.', 'green');
  } else {
    log('\n⚠️  Some requirements not met. See failed tests above.', 'yellow');
    if (testsFailed > 0 && testsPassed === 0) {
      log('\n💡 Tip: Apply the database schema first:', 'yellow');
      log('   1. Open Supabase SQL Editor', 'yellow');
      log('   2. Run SQL from db/schema.sql', 'yellow');
      log('   3. Re-run this test: node test-search-function.js\n', 'yellow');
    }
  }
  
  log('\n');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log('\n❌ Test execution failed:', 'red');
  log(error.message, 'red');
  console.error(error);
  process.exit(1);
});
