/**
 * Smoke Test for RAG Search Function
 * Tests 10 queries with mix of easy and medium difficulty
 * Evaluates if correct insurers are retrieved
 */

import { searchSimilarChunks } from './src/services/rag.service.js';
import supabase from './src/db/supabase.js';
import fs from 'fs';

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

// Test queries with expected insurers
const TEST_QUERIES = [
  // EASY - Direct insurer/product mentions
  {
    id: 1,
    difficulty: 'EASY',
    query: 'Allianz Krankenversicherung',
    expectedInsurers: ['Allianz'],
    description: 'Direct mention of insurer and product'
  },
  {
    id: 2,
    difficulty: 'EASY',
    query: 'HUK Autoversicherung',
    expectedInsurers: ['HUK'],
    description: 'Direct mention of insurer and auto insurance'
  },
  {
    id: 3,
    difficulty: 'EASY',
    query: 'ERGO Hausratversicherung',
    expectedInsurers: ['ERGO'],
    description: 'Direct mention of insurer and household insurance'
  },
  
  // EASY-MEDIUM - Product type queries
  {
    id: 4,
    difficulty: 'EASY',
    query: 'Was ist eine Krankenversicherung?',
    expectedInsurers: ['Allianz'],
    description: 'General health insurance question'
  },
  {
    id: 5,
    difficulty: 'EASY',
    query: 'Wie funktioniert Autoversicherung?',
    expectedInsurers: ['HUK'],
    description: 'General auto insurance question'
  },
  {
    id: 6,
    difficulty: 'MEDIUM',
    query: 'Hausrat Versicherung Leistungen',
    expectedInsurers: ['ERGO'],
    description: 'Household insurance benefits query'
  },
  
  // MEDIUM - Specific feature queries
  {
    id: 7,
    difficulty: 'MEDIUM',
    query: 'Welche Kosten deckt die Krankenversicherung ab?',
    expectedInsurers: ['Allianz'],
    description: 'Health insurance coverage costs'
  },
  {
    id: 8,
    difficulty: 'MEDIUM',
    query: 'Vollkasko oder Teilkasko Auto?',
    expectedInsurers: ['HUK'],
    description: 'Comprehensive vs partial auto coverage'
  },
  {
    id: 9,
    difficulty: 'MEDIUM',
    query: 'Hausratversicherung bei Einbruch',
    expectedInsurers: ['ERGO'],
    description: 'Household insurance for burglary'
  },
  
  // MEDIUM - Comparison queries
  {
    id: 10,
    difficulty: 'MEDIUM',
    query: 'Unterschied gesetzliche und private Krankenversicherung',
    expectedInsurers: ['Allianz'],
    description: 'Statutory vs private health insurance difference'
  }
];

async function getInsurerNameById(insurerId) {
  const { data, error } = await supabase
    .from('insurers')
    .select('name')
    .eq('id', insurerId)
    .single();
  
  if (error || !data) return 'Unknown';
  return data.name;
}

async function runSmokeTests() {
  log('\n' + '='.repeat(80), 'cyan');
  log('  RAG SEARCH SMOKE TEST', 'cyan');
  log('  Testing 10 queries with vector similarity search', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  const results = [];
  let passCount = 0;
  let failCount = 0;
  const issues = [];

  // Check if we have data in database
  log('📊 Checking database status...', 'blue');
  const { data: insurers, error: insurersError } = await supabase
    .from('insurers')
    .select('id, name');
  
  const { data: chunks, error: chunksError } = await supabase
    .from('document_chunks')
    .select('id')
    .limit(1);

  if (insurersError || chunksError) {
    log('❌ Database error:', 'red');
    log(`   Insurers: ${insurersError?.message || 'OK'}`, 'gray');
    log(`   Chunks: ${chunksError?.message || 'OK'}`, 'gray');
    issues.push('Database connection error - cannot run tests');
    return { results, passCount, failCount, issues, insurers: [] };
  }

  if (!insurers || insurers.length === 0) {
    log('⚠️  No insurers found in database', 'yellow');
    issues.push('No insurer data - need to run data loading scripts');
  }

  if (!chunks || chunks.length === 0) {
    log('⚠️  No document chunks found in database', 'yellow');
    issues.push('No document chunks - need to run embedding pipeline');
  }

  log(`✅ Found ${insurers?.length || 0} insurers in database`, 'green');
  log(`✅ Database has document chunks: ${chunks?.length > 0 ? 'Yes' : 'No'}\n`, chunks?.length > 0 ? 'green' : 'yellow');

  // Run each test query
  for (const testCase of TEST_QUERIES) {
    log(`\n${'─'.repeat(80)}`, 'gray');
    log(`Test ${testCase.id}/10 [${testCase.difficulty}]`, 'bold');
    log(`Query: "${testCase.query}"`, 'cyan');
    log(`Expected: ${testCase.expectedInsurers.join(', ')}`, 'gray');
    
    const testResult = {
      id: testCase.id,
      difficulty: testCase.difficulty,
      query: testCase.query,
      description: testCase.description,
      expectedInsurers: testCase.expectedInsurers,
      retrievedInsurers: [],
      topChunks: [],
      passed: false,
      error: null,
      executionTime: 0
    };

    try {
      const startTime = Date.now();
      
      // Run search
      const searchResult = await searchSimilarChunks(testCase.query, {
        matchCount: 5,
        matchThreshold: 0.3, // Lower threshold for smoke test
        timeout: 10000
      });
      
      testResult.executionTime = Date.now() - startTime;

      // Get insurer names for retrieved chunks
      const insurerIds = [...new Set(searchResult.results.map(r => r.insurerId))];
      const insurerNames = await Promise.all(
        insurerIds.map(id => getInsurerNameById(id))
      );
      
      testResult.retrievedInsurers = insurerNames;
      testResult.topChunks = searchResult.results.slice(0, 3).map(r => ({
        insurerId: r.insurerId,
        similarity: r.similarity,
        preview: r.chunkText.substring(0, 100) + '...'
      }));

      // Check if expected insurers were retrieved
      const foundExpected = testCase.expectedInsurers.some(expected => 
        insurerNames.some(name => name.toLowerCase().includes(expected.toLowerCase()))
      );

      testResult.passed = foundExpected;

      if (foundExpected) {
        passCount++;
        log(`✅ PASS - Found expected insurer(s)`, 'green');
        log(`   Retrieved: ${insurerNames.join(', ')}`, 'gray');
        log(`   Time: ${testResult.executionTime}ms`, 'gray');
      } else {
        failCount++;
        log(`❌ FAIL - Expected insurer not found`, 'red');
        log(`   Expected: ${testCase.expectedInsurers.join(', ')}`, 'gray');
        log(`   Retrieved: ${insurerNames.join(', ') || 'None'}`, 'gray');
        issues.push(`Query ${testCase.id}: Expected ${testCase.expectedInsurers.join(', ')} but got ${insurerNames.join(', ') || 'no results'}`);
      }

      // Show top results
      if (searchResult.results.length > 0) {
        log(`   Top result similarity: ${searchResult.results[0].similarity.toFixed(3)}`, 'gray');
      } else {
        log(`   No results returned`, 'yellow');
      }

    } catch (error) {
      failCount++;
      testResult.error = error.message;
      log(`❌ ERROR: ${error.message}`, 'red');
      issues.push(`Query ${testCase.id}: ${error.message}`);
    }

    results.push(testResult);
  }

  // Summary
  log('\n' + '='.repeat(80), 'cyan');
  log('  TEST SUMMARY', 'cyan');
  log('='.repeat(80), 'cyan');
  
  const totalTests = TEST_QUERIES.length;
  const passRate = totalTests > 0 ? (passCount / totalTests * 100).toFixed(1) : 0;
  
  log(`\nTotal Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passCount}`, 'green');
  log(`Failed: ${failCount}`, failCount > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');

  // Performance stats
  const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
  log(`\nAverage Query Time: ${avgTime.toFixed(0)}ms`, 'blue');
  
  const maxTime = Math.max(...results.map(r => r.executionTime));
  log(`Slowest Query: ${maxTime}ms`, maxTime > 500 ? 'yellow' : 'green');

  return { results, passCount, failCount, issues, passRate, avgTime, insurers };
}

function generateReport(testData) {
  const { results, passCount, failCount, issues, passRate, avgTime, insurers } = testData;
  
  const timestamp = new Date().toISOString();
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let report = `# RAG Search Smoke Test Results\n\n`;
  report += `**Date:** ${date}\n`;
  report += `**Timestamp:** ${timestamp}\n`;
  report += `**Tester:** Suria (with Surendra)\n\n`;

  // Executive Summary
  report += `## 📊 Executive Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Tests | ${results.length} |\n`;
  report += `| Passed | ${passCount} |\n`;
  report += `| Failed | ${failCount} |\n`;
  report += `| Pass Rate | ${passRate}% |\n`;
  report += `| Avg Query Time | ${avgTime?.toFixed(0) || 'N/A'}ms |\n`;
  report += `| Status | ${passRate >= 80 ? '✅ GOOD' : passRate >= 60 ? '⚠️ NEEDS WORK' : '❌ CRITICAL'} |\n\n`;

  // Database Status
  report += `## 🗄️ Database Status\n\n`;
  report += `- **Insurers in DB:** ${insurers?.length || 0}\n`;
  if (insurers && insurers.length > 0) {
    report += `- **Insurer Names:** ${insurers.map(i => i.name).join(', ')}\n`;
  }
  report += `- **Document Chunks:** ${results[0]?.topChunks?.length > 0 ? 'Available ✅' : 'Missing ⚠️'}\n\n`;

  // Test Results Detail
  report += `## 🧪 Test Results Detail\n\n`;
  
  results.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    const statusEmoji = test.passed ? '✅' : '❌';
    
    report += `### ${statusEmoji} Test ${test.id}: ${test.difficulty}\n\n`;
    report += `**Query:** "${test.query}"\n\n`;
    report += `**Description:** ${test.description}\n\n`;
    report += `| Attribute | Value |\n`;
    report += `|-----------|-------|\n`;
    report += `| Status | ${status} |\n`;
    report += `| Expected Insurers | ${test.expectedInsurers.join(', ')} |\n`;
    report += `| Retrieved Insurers | ${test.retrievedInsurers.join(', ') || 'None'} |\n`;
    report += `| Execution Time | ${test.executionTime}ms |\n`;
    
    if (test.error) {
      report += `| Error | ${test.error} |\n`;
    }
    
    report += `\n`;

    // Top results
    if (test.topChunks && test.topChunks.length > 0) {
      report += `**Top Results:**\n\n`;
      test.topChunks.forEach((chunk, idx) => {
        report += `${idx + 1}. Similarity: ${chunk.similarity.toFixed(3)} - "${chunk.preview}"\n`;
      });
      report += `\n`;
    } else {
      report += `**Top Results:** No results returned\n\n`;
    }
  });

  // Issues
  report += `## 🐛 Issues Identified\n\n`;
  if (issues.length === 0) {
    report += `✅ No issues found! All tests passed successfully.\n\n`;
  } else {
    issues.forEach((issue, idx) => {
      report += `${idx + 1}. ${issue}\n`;
    });
    report += `\n`;
  }

  // Recommendations
  report += `## 💡 Recommendations\n\n`;
  
  if (passRate < 50) {
    report += `### Critical Issues\n\n`;
    report += `- Pass rate is below 50% - Major issues detected\n`;
    report += `- Check if document embeddings are loaded\n`;
    report += `- Verify search function is working correctly\n`;
    report += `- Review query embedding generation\n\n`;
  } else if (passRate < 80) {
    report += `### Needs Improvement\n\n`;
    report += `- Pass rate is ${passRate}% - Some queries failing\n`;
    report += `- Review failed queries and adjust matching threshold\n`;
    report += `- Consider improving document chunking strategy\n`;
    report += `- Verify insurer names match expected values\n\n`;
  } else {
    report += `### Good Performance\n\n`;
    report += `- Pass rate is ${passRate}% - System working well\n`;
    report += `- Ready for more comprehensive testing\n`;
    report += `- Consider tuning for edge cases\n\n`;
  }

  // Performance Analysis
  report += `## ⚡ Performance Analysis\n\n`;
  const slowQueries = results.filter(r => r.executionTime > 500);
  if (slowQueries.length > 0) {
    report += `**Slow Queries (>500ms):**\n\n`;
    slowQueries.forEach(q => {
      report += `- Test ${q.id}: ${q.executionTime}ms - "${q.query}"\n`;
    });
    report += `\n**Action:** Optimize these queries or adjust timeout settings.\n\n`;
  } else {
    report += `✅ All queries completed in acceptable time (<500ms)\n\n`;
  }

  // Completion Checklist
  report += `## ✅ Completion Checklist\n\n`;
  report += `- [${results.length === 10 ? 'x' : ' '}] All 10 smoke test queries are run\n`;
  report += `- [x] Results are logged in the template format\n`;
  report += `- [x] Pass rate is calculated (${passRate}%)\n`;
  report += `- [x] Issues are documented (${issues.length} issues)\n`;
  report += `- [ ] Results are shared with Surendra\n`;
  report += `- [${passRate >= 80 ? 'x' : ' '}] Ready for full evaluation or tuning\n\n`;

  // Next Steps
  report += `## 🚀 Next Steps\n\n`;
  
  if (insurers?.length === 0 || results[0]?.topChunks?.length === 0) {
    report += `1. **Load Data:** Run data processing pipeline to populate database\n`;
    report += `   \`\`\`bash\n`;
    report += `   node scripts/data-processing/01-clean-documents.js\n`;
    report += `   node scripts/data-processing/02-chunk-documents.js\n`;
    report += `   node scripts/data-processing/03-generate-embeddings.js\n`;
    report += `   node scripts/data-processing/04-upload-to-supabase.js\n`;
    report += `   \`\`\`\n\n`;
    report += `2. **Re-run Tests:** After data is loaded\n`;
    report += `   \`\`\`bash\n`;
    report += `   node smoke-test-queries.js\n`;
    report += `   \`\`\`\n\n`;
  } else if (passRate < 80) {
    report += `1. **Review Failed Queries:** Analyze why certain queries failed\n`;
    report += `2. **Tune Parameters:** Adjust match threshold or improve embeddings\n`;
    report += `3. **Improve Chunks:** Better chunking strategy may help\n`;
    report += `4. **Re-test:** Run smoke tests again after improvements\n\n`;
  } else {
    report += `1. **Share Results:** Send this report to Surendra\n`;
    report += `2. **Full Evaluation:** Ready for comprehensive testing\n`;
    report += `3. **Production Tuning:** Fine-tune parameters for production use\n`;
    report += `4. **Monitor Performance:** Track query times in production\n\n`;
  }

  // Metadata
  report += `---\n\n`;
  report += `**Generated by:** RAG Search Smoke Test Suite\n`;
  report += `**Report Version:** 1.0\n`;
  report += `**Contact:** Suria & Surendra\n`;

  return report;
}

async function main() {
  try {
    const testData = await runSmokeTests();
    
    // Generate report
    log('\n📝 Generating report...', 'blue');
    const report = generateReport(testData);
    
    // Save report
    const filename = `smoke-test-results-${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(filename, report);
    log(`✅ Report saved: ${filename}`, 'green');

    // Show issues
    if (testData.issues.length > 0) {
      log('\n🐛 Issues Found:', 'yellow');
      testData.issues.forEach((issue, idx) => {
        log(`   ${idx + 1}. ${issue}`, 'yellow');
      });
    }

    // Final status
    log('\n' + '='.repeat(80), 'cyan');
    if (testData.passRate >= 80) {
      log('  ✅ SMOKE TEST PASSED - Ready for full evaluation', 'green');
    } else if (testData.passRate >= 60) {
      log('  ⚠️  SMOKE TEST PARTIAL - Needs improvement', 'yellow');
    } else {
      log('  ❌ SMOKE TEST FAILED - Critical issues found', 'red');
    }
    log('='.repeat(80) + '\n', 'cyan');

    process.exit(testData.failCount > 0 ? 1 : 0);

  } catch (error) {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
