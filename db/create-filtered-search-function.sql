-- ============================================================================
-- Enhanced search function with insurance type filtering
-- ============================================================================
-- Apply this SQL in Supabase SQL Editor to add insurance type filtering
-- ============================================================================

-- Create enhanced search function with insurance type filter
CREATE OR REPLACE FUNCTION search_similar_chunks_filtered(
  query_embedding VECTOR(768),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7,
  insurance_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  insurer_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  metadata JSONB,
  insurance_type VARCHAR(100)
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
    dc.metadata,
    d.insurance_type
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    -- Similarity filter
    1 - (dc.embedding <=> query_embedding) > similarity_threshold
    -- Insurance type filter (if provided)
    AND (
      insurance_types IS NULL 
      OR d.insurance_type = ANY(insurance_types)
    )
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create index on documents.insurance_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_insurance_type 
ON documents(insurance_type);

-- Test the function
SELECT * FROM search_similar_chunks_filtered(
  ARRAY(SELECT generate_series(1,768)::float / 768.0)::vector(768),
  5,
  0.5,
  ARRAY['health', 'life']  -- Filter for health or life insurance
);

-- ✅ Function created successfully!
-- Now update the service to use this function
