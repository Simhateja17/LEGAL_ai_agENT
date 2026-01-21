-- ================================================================
-- German Laws Vector Search Function for Supabase (1536 dimensions)
-- ================================================================
-- Run this in Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/kxplqylfijtyhcmcbpae/sql/new
-- ================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS search_german_laws(text, float, int);
DROP FUNCTION IF EXISTS search_german_laws_text(text, int);

-- ================================================================
-- Main Vector Search Function - Uses cosine similarity
-- Accepts embedding as text (JSON array format: '[0.1, 0.2, ...]')
-- ================================================================
CREATE OR REPLACE FUNCTION search_german_laws(
  query_embedding text,           -- JSON array as string
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
  -- Convert text (JSON array) to vector type
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

-- ================================================================
-- Text-based Search Function (fallback when vector search unavailable)
-- Uses PostgreSQL full-text search
-- ================================================================
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

-- ================================================================
-- Create index for faster text search
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_german_laws_content_fts 
ON german_laws_v2 USING gin(to_tsvector('german', content));

-- ================================================================
-- Create vector index for faster similarity search (HNSW is faster than IVFFlat)
-- ================================================================
-- Note: This may take a while for 472k rows
CREATE INDEX IF NOT EXISTS idx_german_laws_embedding_hnsw 
ON german_laws_v2 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ================================================================
-- Test the functions
-- ================================================================
-- Test text search
SELECT * FROM search_german_laws_text('Kaufvertrag', 3);

-- Vector search test (with dummy embedding - replace with real embedding)
-- SELECT * FROM search_german_laws(
--   '[' || array_to_string(array_fill(0.01::float, ARRAY[1536]), ',') || ']',
--   0.1,
--   3
-- );

-- ================================================================
-- Verification
-- ================================================================
SELECT 'search_german_laws function' as function_name, 
       pg_get_functiondef('search_german_laws'::regproc) IS NOT NULL as exists;
SELECT 'search_german_laws_text function' as function_name,
       pg_get_functiondef('search_german_laws_text'::regproc) IS NOT NULL as exists;
