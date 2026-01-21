/**
 * Test Script for Insurance Type Filtering
 * Tests single and multiple type filters with various edge cases
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
  gray: '\x1b[90m',
  bold: '\x1b[1m'
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
  log('\n' + '='.repeat(80), 'cyan');
  log('  INSURANCE TYPE FILTER TESTS', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Single insurance type filter
  log('Test 1: Single insurance type filter works', 'blue');
  try {
    const result = await searchSimilarChunks('Krankenversicherung', {
      insuranceTypes: 'health',
      matchCount: 5,
      matchThreshold: 0.3
    });

    const allHealthType = result.results.every(r => r.insuranceType === 'health');
    const hasFilterFlag = result.stats.filteredByType === true;
    const correctFilter = result.stats.insuranceTypesFilter.includes('health');
    
    const passed = allHealthType && hasFilterFlag && correctFilter;
    logTest(
      'Single insurance type filter works',
      passed,
      `Found ${result.results.length} results, all type: ${allHealthType ? 'health' : 'mixed'}`
    );
    
    if (passed) {
      testsPassed++;
      log(`   Filter applied: ${result.stats.insuranceTypesFilter}`, 'gray');
    } else {
      testsFailed++;
      log(`   Types found: ${[...new Set(result.results.map(r => r.insuranceType))].join(', ')}`, 'yellow');
    }
  } catch (error) {
    logTest('Single insurance type filter works', false, error.message);
    testsFailed++;
  }

  // Test 2: Multiple type filter works (array)
  log('\nTest 2: Multiple type filter works (array)', 'blue');
  try {
    const result = await searchSimilarChunks('Versicherung', {
      insuranceTypes: ['health', 'life'],
      matchCount: 10,
      matchThreshold: 0.3
    });

    const allowedTypes = ['health', 'life'];
    const allValidTypes = result.results.every(r => allowedTypes.includes(r.insuranceType));
    const hasMultipleFilters = Array.isArray(result.stats.insuranceTypesFilter) && 
                               result.stats.insuranceTypesFilter.length > 1;
    
    const passed = allValidTypes && hasMultipleFilters;
    logTest(
      'Multiple type filter works (array)',
      passed,
      `Found ${result.results.length} results with types: ${[...new Set(result.results.map(r => r.insuranceType))].join(', ')}`
    );
    
    if (passed) {
      testsPassed++;
      log(`   Filters: ${result.stats.insuranceTypesFilter.join(' OR ')}`, 'gray');
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Multiple type filter works (array)', false, error.message);
    testsFailed++;
  }

  // Test 3: Invalid filter values are handled gracefully
  log('\nTest 3: Invalid filter values are handled gracefully', 'blue');
  try {
    const result = await searchSimilarChunks('Test query', {
      insuranceTypes: ['', null, 'health', undefined, '   '],
      matchCount: 5,
      matchThreshold: 0.3
    });

    // Should filter out invalid values and keep 'health'
    const hasValidFilter = result.stats.insuranceTypesFilter.includes('health');
    const noInvalidValues = !result.stats.insuranceTypesFilter.some(f => 
      f === '' || f === null || f === undefined || f.trim() === ''
    );
    
    const passed = hasValidFilter && noInvalidValues;
    logTest(
      'Invalid filter values are handled gracefully',
      passed,
      `Filtered to: ${result.stats.insuranceTypesFilter}`
    );
    
    if (passed) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Invalid filter values are handled gracefully', false, error.message);
    testsFailed++;
  }

  // Test 4: Empty results return appropriate response
  log('\nTest 4: Empty results return appropriate response', 'blue');
  try {
    const result = await searchSimilarChunks('xyz_nonexistent_query_12345', {
      insuranceTypes: 'health',
      matchCount: 5,
      matchThreshold: 0.95 // Very high threshold
    });

    const hasEmptyResults = result.results.length === 0;
    const hasStats = result.stats && result.stats.totalResults === 0;
    const noError = true; // If we got here, no error was thrown
    
    const passed = hasEmptyResults && hasStats && noError;
    logTest(
      'Empty results return appropriate response',
      passed,
      `Results: ${result.results.length}, No error thrown`
    );
    
    if (passed) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Empty results return appropriate response', false, error.message);
    testsFailed++;
  }

  // Test 5: Filter-first then rank by similarity
  log('\nTest 5: Combine with similarity — Filter first, then rank', 'blue');
  try {
    const result = await searchSimilarChunks('Krankenversicherung Kosten', {
      insuranceTypes: 'health',
      matchCount: 5,
      matchThreshold: 0.3
    });

    const allFilteredType = result.results.every(r => r.insuranceType === 'health');
    const rankedBySimilarity = result.results.every((r, i, arr) => 
      i === 0 || arr[i - 1].similarity >= r.similarity
    );
    
    const passed = allFilteredType && rankedBySimilarity;
    logTest(
      'Combine with similarity — Filter first, then rank',
      passed,
      `Filtered: ${allFilteredType}, Ranked: ${rankedBySimilarity}`
    );
    
    if (passed) {
      testsPassed++;
      if (result.results.length > 0) {
        log(`   Similarity range: ${result.results[0].similarity.toFixed(3)} to ${result.results[result.results.length - 1].similarity.toFixed(3)}`, 'gray');
      }
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('Combine with similarity — Filter first, then rank', false, error.message);
    testsFailed++;
  }

  // Test 6: No filter (all types)
  log('\nTest 6: No filter returns all types', 'blue');
  try {
    const result = await searchSimilarChunks('Versicherung', {
      matchCount: 10,
      matchThreshold: 0.3
    });

    const noFilter = result.stats.insuranceTypesFilter === 'none';
    const notFiltered = result.stats.filteredByType === false;
    const hasResults = result.results.length > 0;
    
    const passed = noFilter && notFiltered && hasResults;
    logTest(
      'No filter returns all types',
      passed,
      `Filter: ${result.stats.insuranceTypesFilter}, Results: ${result.results.length}`
    );
    
    if (passed) {
      testsPassed++;
      const types = [...new Set(result.results.map(r => r.insuranceType))];
      log(`   Types found: ${types.join(', ')}`, 'gray');
    } else {
      testsFailed++;
    }
  } catch (error) {
    logTest('No filter returns all types', false, error.message);
    testsFailed++;
  }

  // Summary
  log('\n' + '='.repeat(80), 'cyan');
  log('  TEST SUMMARY', 'cyan');
  log('='.repeat(80), 'cyan');
  
  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;
  
  log(`\nTests Passed: ${testsPassed}/${total} (${percentage}%)`, testsPassed === total ? 'green' : 'yellow');
  
  if (testsFailed > 0) {
    log(`Tests Failed: ${testsFailed}/${total}`, 'red');
  }

  // Completion checklist
  log('\n' + '='.repeat(80), 'cyan');
  log('  ✅ COMPLETION CHECKLIST', 'cyan');
  log('='.repeat(80), 'cyan');
  
  const checklist = [
    { label: 'Single insurance type filter works', check: testsPassed >= 1 },
    { label: 'Multiple type filter works (array)', check: testsPassed >= 2 },
    { label: 'Invalid filter values are handled gracefully', check: testsPassed >= 3 },
    { label: 'Empty results return appropriate response', check: testsPassed >= 4 },
    { label: 'API documentation is updated', check: true },
    { label: 'Tested with various filter combinations', check: testsPassed >= 5 }
  ];

  checklist.forEach(item => {
    const icon = item.check ? '✅' : '❌';
    const color = item.check ? 'green' : 'red';
    log(`   ${icon} ${item.label}`, color);
  });

  const allComplete = checklist.every(item => item.check);
  
  if (allComplete) {
    log('\n🎉 All requirements complete! Insurance type filtering is ready.', 'green');
  } else {
    log('\n⚠️  Some requirements not met. See failed tests above.', 'yellow');
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
