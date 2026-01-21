/**
 * Complete RAG Pipeline Test
 * Tests the full flow: Query → Embeddings → Vector Search → LLM → Answer
 */

import dotenv from 'dotenv';
dotenv.config();

import * as ragService from './src/services/rag.service.js';
import * as embeddingService from './src/services/embedding.service.js';
import * as llmService from './src/services/llm.service.js';

async function testRAGPipeline() {
  console.log('🚀 Testing Complete RAG Pipeline\n');
  console.log('=' .repeat(60));
  
  // Test queries in German
  const testQueries = [
    'Was ist ein Kaufvertrag nach dem BGB?',
    'Welche Rechte hat ein Mieter?',
    'Was bedeutet Schadensersatz?'
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"\n`);
    console.log('-'.repeat(60));
    
    try {
      const startTime = Date.now();
      
      // Step 1: Generate embedding for query
      console.log('1️⃣  Generating embedding...');
      const embeddingStart = Date.now();
      const embedding = await embeddingService.generateEmbedding(query);
      console.log(`   ✅ Embedding generated (${embedding.length} dimensions) in ${Date.now() - embeddingStart}ms`);
      
      // Step 2: Run full RAG pipeline
      console.log('2️⃣  Running RAG pipeline (search + LLM)...');
      const result = await ragService.searchDocuments(query);
      
      console.log(`   ✅ Found ${result.results?.length || 0} relevant documents`);
      console.log(`   ✅ Answer generated in ${result.metadata?.totalTime || Date.now() - startTime}ms\n`);
      
      // Show results
      console.log('📊 Results:');
      if (result.results && result.results.length > 0) {
        result.results.slice(0, 3).forEach((doc, i) => {
          console.log(`   ${i + 1}. ${doc.law_code || 'Law'} ${doc.paragraph_number || ''}`);
          console.log(`      Category: ${doc.category || 'N/A'}`);
          console.log(`      Similarity: ${((doc.similarity || 0) * 100).toFixed(1)}%`);
          console.log(`      Preview: ${(doc.content || '').substring(0, 100)}...`);
        });
      }
      
      console.log('\n📜 Answer (truncated):');
      console.log(result.answer?.substring(0, 500) + '...');
      
      console.log('\n⏱️  Timing:');
      console.log(`   Embedding: ${result.metadata?.embeddingTime || 'N/A'}ms`);
      console.log(`   Search: ${result.metadata?.searchTime || 'N/A'}ms`);
      console.log(`   LLM: ${result.metadata?.llmTime || 'N/A'}ms`);
      console.log(`   Total: ${result.metadata?.totalTime || 'N/A'}ms`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  // Test service info
  console.log('\n📋 Service Information:');
  console.log('Embedding Service:', embeddingService.getEmbeddingServiceInfo());
  console.log('LLM Service:', llmService.getLLMServiceInfo());
  console.log('RAG Service:', ragService.getRagServiceInfo());
}

testRAGPipeline().catch(console.error);
