-- ================================================================
-- Vector Search Functions for Legal Chatbot (documents table)
-- ================================================================
-- Run this in Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/bnkycqwyoofvenmpckdm/sql/new
-- ================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS search_documents(text, float, int);
DROP FUNCTION IF EXISTS match_documents(text, float, int);

-- ================================================================
-- Main Vector Search Function - Uses cosine similarity
-- For the 'documents' table with 1536-dimension embeddings
-- ================================================================
CREATE OR REPLACE FUNCTION search_documents(
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
SET search_path = public
AS $$
DECLARE
  embedding_vector vector(1536);
BEGIN
  -- Convert text (JSON array) to vector type
  embedding_vector := query_embedding::vector(1536);
  
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> embedding_vector))::float AS similarity
  FROM documents d
  WHERE d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> embedding_vector)) > match_threshold
  ORDER BY d.embedding <=> embedding_vector
  LIMIT match_count;
END;
$$;

-- ================================================================
-- Alternative function name for compatibility
-- ================================================================
CREATE OR REPLACE FUNCTION match_documents(
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
BEGIN
  RETURN QUERY
  SELECT * FROM search_documents(query_embedding, match_threshold, match_count);
END;
$$;

-- ================================================================
-- Create HNSW index for faster vector search (recommended)
-- This may take a few minutes for 65k documents
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw 
ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ================================================================
-- Create text search index for fallback
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_documents_content_gin 
ON documents 
USING gin(to_tsvector('german', content));

-- ================================================================
-- Test the function
-- ================================================================
-- This should return results if embeddings exist
SELECT 'Testing search_documents function...' as status;

-- Simple test with a dummy embedding (all zeros won't match much)
-- SELECT * FROM search_documents(
--   '[' || array_to_string(array_fill(0.01::float, ARRAY[1536]), ',') || ']',
--   0.1,
--   3
-- );

-- ================================================================
-- Verification
-- ================================================================
SELECT 'search_documents' as function_name, 
       pg_get_functiondef('search_documents'::regproc) IS NOT NULL as exists;
SELECT 'match_documents' as function_name,
       pg_get_functiondef('match_documents'::regproc) IS NOT NULL as exists;
