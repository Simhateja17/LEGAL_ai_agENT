/**
 * COMPLETE RAG SETUP TEST SUITE
 * 
 * This script performs comprehensive testing of the entire RAG system:
 * 1. Database connection and schema verification
 * 2. Embedding service functionality
 * 3. LLM service functionality
 * 4. RAG pipeline end-to-end
 * 5. API endpoints (if server is running)
 * 
 * Run this after setting up your database to verify everything works.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import embeddingService from './src/services/embedding.service.js';
import llmService from './src/services/llm.service.js';
import ragService from './src/services/rag.service.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log('\n' + '='.repeat(80));
console.log('🧪 GERMAN INSURANCE RAG - COMPLETE SYSTEM TEST');
console.log('='.repeat(80) + '\n');

let testsPassed = 0;
let testsFailed = 0;
const results = [];

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`${icon} [${status}] ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  results.push({ name, passed, details });
  if (passed) testsPassed++;
  else testsFailed++;
}

async function testDatabaseConnection() {
  console.log('\n📋 TEST SUITE 1: DATABASE CONNECTION');
  console.log('-'.repeat(80));
  
  try {
    if (!supabaseUrl || !supabaseKey) {
      logTest('Environment variables', false, 'SUPABASE_URL or SUPABASE_KEY missing in .env');
      return false;
    }
    logTest('Environment variables', true, 'SUPABASE_URL and SUPABASE_KEY configured');

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test insurers table
    const { data: insurers, error: insurersError } = await supabase
      .from('insurers')
      .select('id, name')
      .limit(5);
    
    if (insurersError) {
      logTest('Insurers table', false, insurersError.message);
      return false;
    }
    logTest('Insurers table', true, `${insurers.length} insurers found`);

    // Test documents table
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (docsError) {
      logTest('Documents table', false, docsError.message);
    } else {
      logTest('Documents table', true, 'Table accessible');
    }

    // Test document_chunks table
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1);
    
    if (chunksError) {
      logTest('Document chunks table', false, chunksError.message);
    } else {
      logTest('Document chunks table', true, 'Table accessible');
    }

    return true;
  } catch (error) {
    logTest('Database connection', false, error.message);
    return false;
  }
}

async function testEmbeddingService() {
  console.log('\n📋 TEST SUITE 2: EMBEDDING SERVICE');
  console.log('-'.repeat(80));
  
  try {
    // Test 1: Generate single embedding
    const text = 'Krankenversicherung in Deutschland';
    const embedding = await embeddingService.generateEmbedding(text);
    
    if (!embedding || !Array.isArray(embedding)) {
      logTest('Generate embedding', false, 'Invalid embedding format');
      return false;
    }
    
    const expectedDim = 768;
    const actualDim = embedding.length;
    if (actualDim !== expectedDim) {
      logTest('Embedding dimensions', false, `Expected ${expectedDim}, got ${actualDim}`);
      return false;
    }
    logTest('Generate embedding', true, `Generated ${actualDim}-dimensional vector`);
    logTest('Embedding dimensions', true, `Correct dimension (${expectedDim})`);

    // Test 2: Batch embeddings
    const texts = [
      'Hausratversicherung',
      'Autoversicherung',
      'Lebensversicherung'
    ];
    const batchEmbeddings = await embeddingService.generateBatchEmbeddings(texts);
    logTest('Batch embeddings', batchEmbeddings.length === 3, `Generated ${batchEmbeddings.length}/3 embeddings`);

    // Test 3: Cosine similarity
    const similarity = embeddingService.cosineSimilarity(embedding, embedding);
    const isValidSimilarity = similarity >= 0.99 && similarity <= 1.0;
    logTest('Cosine similarity', isValidSimilarity, `Self-similarity: ${similarity.toFixed(4)}`);

    // Test 4: Service info
    const info = embeddingService.getEmbeddingServiceInfo();
    logTest('Service info', info.model && info.dimensions, `Model: ${info.model}, Mode: ${info.mode}`);

    return true;
  } catch (error) {
    logTest('Embedding service', false, error.message);
    return false;
  }
}

async function testLLMService() {
  console.log('\n📋 TEST SUITE 3: LLM SERVICE');
  console.log('-'.repeat(80));
  
  try {
    const query = 'Was kostet eine Krankenversicherung?';
    const context = [
      {
        chunk_text: 'Die Krankenversicherung kostet zwischen 300 und 800 Euro pro Monat.',
        similarity: 0.85,
        metadata: { insurer: 'Test Insurer' }
      }
    ];

    // Test 1: Generate answer
    const answer = await llmService.generateAnswer(query, context);
    if (!answer || typeof answer !== 'string') {
      logTest('Generate answer', false, 'Invalid answer format');
      return false;
    }
    logTest('Generate answer', true, `Answer length: ${answer.length} chars`);

    // Test 2: Answer contains relevant content
    const hasContent = answer.length > 20;
    logTest('Answer quality', hasContent, 'Answer has meaningful content');

    // Test 3: Service info
    const info = llmService.getLLMServiceInfo();
    logTest('LLM service info', info.model && info.mode, `Model: ${info.model}, Mode: ${info.mode}`);

    return true;
  } catch (error) {
    logTest('LLM service', false, error.message);
    return false;
  }
}

async function testRAGPipeline() {
  console.log('\n📋 TEST SUITE 4: RAG PIPELINE (END-TO-END)');
  console.log('-'.repeat(80));
  
  try {
    const queries = [
      'Krankenversicherung Kosten',
      'Hausratversicherung Leistungen',
      'Autoversicherung Vergleich'
    ];

    for (const query of queries) {
      console.log(`\n   Testing query: "${query}"`);
      
      const result = await ragService.searchDocuments(query, {
        limit: 5,
        similarityThreshold: 0.5
      });

      if (!result || !result.answer) {
        logTest(`RAG: "${query}"`, false, 'No answer generated');
        continue;
      }

      logTest(`RAG: "${query}"`, true, 
        `Answer: ${result.answer.substring(0, 60)}... | ` +
        `Sources: ${result.sources?.length || 0} | ` +
        `Time: ${result.metadata?.processingTime || 'N/A'}`
      );
    }

    return true;
  } catch (error) {
    logTest('RAG pipeline', false, error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n📋 TEST SUITE 5: API ENDPOINTS (Optional)');
  console.log('-'.repeat(80));
  console.log('   ℹ️  This test requires the server to be running on port 3000');
  console.log('   Run "npm start" in another terminal if you want to test endpoints\n');
  
  try {
    const baseURL = 'http://localhost:3000';
    
    // Test health endpoint
    const healthResponse = await fetch(`${baseURL}/api/health`).catch(() => null);
    if (!healthResponse) {
      logTest('API /health endpoint', false, 'Server not running on port 3000 (this is OK)');
      return false;
    }
    
    const healthData = await healthResponse.json();
    logTest('API /health endpoint', healthData.status === 'healthy', 
      `Status: ${healthData.status}, Uptime: ${healthData.uptime}`);

    // Test search endpoint
    const searchResponse = await fetch(`${baseURL}/api/query/search?q=Krankenversicherung`);
    const searchData = await searchResponse.json();
    logTest('API /query/search endpoint', searchData.success, 
      `Sources: ${searchData.data?.sources?.length || 0}`);

    // Test stats endpoint
    const statsResponse = await fetch(`${baseURL}/api/stats`);
    const statsData = await statsResponse.json();
    logTest('API /stats endpoint', statsData.success, 
      `Total queries: ${statsData.data?.totalQueries || 0}`);

    return true;
  } catch (error) {
    logTest('API endpoints', false, 'Server not running (this is OK if you haven\'t started it yet)');
    return false;
  }
}

async function runAllTests() {
  const startTime = Date.now();

  await testDatabaseConnection();
  await testEmbeddingService();
  await testLLMService();
  await testRAGPipeline();
  await testAPIEndpoints();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log('='.repeat(80));

  if (testsFailed > 0) {
    console.log('\n⚠️  FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   ❌ ${r.name}: ${r.details}`);
    });
  }

  console.log('\n🎯 NEXT STEPS:');
  if (testsFailed === 0) {
    console.log('   ✅ All tests passed! Your RAG system is ready.');
    console.log('   📍 Start the server: npm start');
    console.log('   📍 Test endpoint: http://localhost:3000/api/query/search?q=Krankenversicherung');
  } else {
    console.log('   1. Review failed tests above');
    console.log('   2. Check your .env configuration');
    console.log('   3. Ensure database schema is set up (run: node setup-database.js)');
    console.log('   4. For API tests, start the server first: npm start');
  }
  console.log('\n' + '='.repeat(80) + '\n');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runAllTests();
