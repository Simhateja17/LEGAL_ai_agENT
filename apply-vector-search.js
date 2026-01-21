/**
 * Apply Vector Search Function to Supabase
 * Run this script to create the search_german_laws RPC function
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CREATE_SEARCH_FUNCTION_SQL = `
-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS search_german_laws(text, float, int);
DROP FUNCTION IF EXISTS search_german_laws_text(text, int);

-- Main Vector Search Function (1536 dimensions for OpenAI embeddings)
CREATE OR REPLACE FUNCTION search_german_laws(
  query_embedding text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  embedding_vector vector(1536);
BEGIN
  embedding_vector := query_embedding::vector(1536);
  
  RETURN QUERY
  SELECT
    gl.id,
    gl.content,
    gl.metadata,
    (1 - (gl.embedding <=> embedding_vector))::float AS similarity
  FROM german_laws_v2 gl
  WHERE gl.embedding IS NOT NULL
    AND (1 - (gl.embedding <=> embedding_vector)) > match_threshold
  ORDER BY gl.embedding <=> embedding_vector
  LIMIT match_count;
END;
$$;

-- Text-based Search Function (fallback)
CREATE OR REPLACE FUNCTION search_german_laws_text(
  search_query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  relevance float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gl.id,
    gl.content,
    gl.metadata,
    ts_rank(
      to_tsvector('german', gl.content),
      plainto_tsquery('german', search_query)
    )::float AS relevance
  FROM german_laws_v2 gl
  WHERE to_tsvector('german', gl.content) @@ plainto_tsquery('german', search_query)
  ORDER BY relevance DESC
  LIMIT result_limit;
END;
$$;
`;

async function applySearchFunction() {
  console.log('🔧 Applying vector search functions to Supabase...\n');
  
  try {
    // First check connection
    const { data: testData, error: testError } = await supabase
      .from('german_laws_v2')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot connect to Supabase:', testError.message);
      return;
    }
    
    console.log('✅ Connected to Supabase');
    console.log('📊 german_laws_v2 table exists\n');
    
    // Note: Supabase JS client doesn't support raw SQL execution
    // The SQL needs to be run in the Supabase SQL Editor
    console.log('⚠️  Important: The SQL functions need to be created via Supabase SQL Editor');
    console.log('📋 Copy the SQL from: db/create-vector-search-1536.sql');
    console.log('🔗 Run it at: https://supabase.com/dashboard/project/kxplqylfijtyhcmcbpae/sql/new\n');
    
    // Test if functions already exist
    console.log('🔍 Testing if search functions already exist...\n');
    
    // Test text search function
    const { data: textData, error: textError } = await supabase
      .rpc('search_german_laws_text', {
        search_query: 'Kaufvertrag',
        result_limit: 3
      });
    
    if (!textError) {
      console.log('✅ search_german_laws_text function exists');
      console.log(`   Found ${textData?.length || 0} results for "Kaufvertrag"\n`);
    } else {
      console.log('❌ search_german_laws_text function not found');
      console.log('   Error:', textError.message, '\n');
    }
    
    // Test vector search function with a sample embedding
    const sampleEmbedding = Array(1536).fill(0.01);
    const { data: vectorData, error: vectorError } = await supabase
      .rpc('search_german_laws', {
        query_embedding: `[${sampleEmbedding.join(',')}]`,
        match_threshold: 0.1,
        match_count: 3
      });
    
    if (!vectorError) {
      console.log('✅ search_german_laws function exists');
      console.log(`   Found ${vectorData?.length || 0} results with sample embedding\n`);
    } else {
      console.log('❌ search_german_laws function not found');
      console.log('   Error:', vectorError.message);
      console.log('\n📋 Please run the SQL in Supabase SQL Editor:\n');
      console.log('─'.repeat(60));
      console.log(CREATE_SEARCH_FUNCTION_SQL);
      console.log('─'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applySearchFunction();
