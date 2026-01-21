-- ================================================================
-- German Laws Vector Search Function for Supabase
-- ================================================================
-- Run this in Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/kxplqylfijtyhcmcbpae/sql/new
-- ================================================================

-- First, let's check the embedding dimension in your table
-- Run this to see the dimension:
-- SELECT vector_dims(embedding) as dimension FROM german_laws_v2 LIMIT 1;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS search_german_laws(text, float, int);
DROP FUNCTION IF EXISTS match_german_laws(vector, float, int);

-- ================================================================
-- Main Search Function - Accepts embedding as text (JSON array)
-- ================================================================
CREATE OR REPLACE FUNCTION search_german_laws(
  query_embedding text,           -- JSON array as string: '[0.1, 0.2, ...]'
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
AS $$
DECLARE
  embedding_vector vector;
BEGIN
  -- Convert text (JSON array) to vector type
  embedding_vector := query_embedding::vector;
  
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
-- Alternative: Simple text search (keyword based, no embeddings)
-- Useful as fallback when embedding dimensions don't match
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gl.id,
    gl.content,
    gl.metadata,
    ts_rank(to_tsvector('german', gl.content), plainto_tsquery('german', search_query))::float AS relevance
  FROM german_laws_v2 gl
  WHERE to_tsvector('german', gl.content) @@ plainto_tsquery('german', search_query)
  ORDER BY relevance DESC
  LIMIT result_limit;
END;
$$;

-- ================================================================
-- Grant permissions to allow API access
-- ================================================================
GRANT EXECUTE ON FUNCTION search_german_laws TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_german_laws_text TO anon, authenticated, service_role;

-- ================================================================
-- Test queries (uncomment to test)
-- ================================================================
-- Test text search:
-- SELECT * FROM search_german_laws_text('Kaufvertrag', 5);
-- SELECT * FROM search_german_laws_text('Mietrecht', 5);
-- SELECT * FROM search_german_laws_text('Schadensersatz', 5);

-- Check embedding dimension:
-- SELECT vector_dims(embedding) as dimension FROM german_laws_v2 LIMIT 1;

-- Check sample data:
-- SELECT id, left(content, 100) as content_preview, metadata FROM german_laws_v2 LIMIT 5;
