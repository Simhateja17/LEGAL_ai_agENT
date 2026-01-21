-- ============================================================================
-- Apply this SQL in Supabase SQL Editor to create the search function
-- ============================================================================
-- URL: https://supabase.com/dashboard/project/vtmsosynpediclfycnni/sql/new
-- ============================================================================

-- Step 1: Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create or replace the search_similar_chunks function
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding VECTOR(768),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  insurer_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.insurer_id,
    dc.chunk_text,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Test the function (will return empty if no data exists)
SELECT * FROM search_similar_chunks(
  ARRAY(SELECT generate_series(1,768)::float / 768.0)::vector(768),
  5,
  0.5
);

-- ✅ Function created successfully!
-- Now run: node test-search-function.js
