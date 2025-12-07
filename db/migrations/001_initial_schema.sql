-- Migration Script: Initial Schema Setup
-- Project: German Insurance AI Backend
-- Date: December 7, 2025
-- Description: Creates all tables, indexes, and functions for the RAG system
-- Compatible with: Supabase (PostgreSQL 15+)

-- =============================================================================
-- STEP 1: Enable Required Extensions
-- =============================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- =============================================================================
-- STEP 2: Create Tables
-- =============================================================================

-- Insurers table: stores information about insurance companies
CREATE TABLE IF NOT EXISTS insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  website VARCHAR(500),
  insurance_types TEXT[], -- Array of insurance types offered
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table: stores insurance documents and policies
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  insurance_type VARCHAR(100), -- e.g., 'health', 'life', 'auto', 'home'
  document_type VARCHAR(100), -- e.g., 'policy', 'terms', 'faq', 'brochure'
  source_url VARCHAR(1000),
  file_path VARCHAR(500),
  language VARCHAR(10) DEFAULT 'de',
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional flexible metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table: stores text chunks with embeddings for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Position of chunk in original document
  token_count INTEGER, -- Number of tokens in chunk
  embedding VECTOR(768), -- 768-dimensional embedding vector
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional chunk metadata (page number, section, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure chunk_index is non-negative
  CONSTRAINT check_chunk_index_non_negative CHECK (chunk_index >= 0),
  -- Ensure token_count is reasonable
  CONSTRAINT check_token_count_positive CHECK (token_count IS NULL OR token_count > 0)
);

-- =============================================================================
-- STEP 3: Create Indexes for Performance
-- =============================================================================

-- Indexes for insurers table
CREATE INDEX IF NOT EXISTS idx_insurers_name ON insurers(name);
CREATE INDEX IF NOT EXISTS idx_insurers_name_lower ON insurers(LOWER(name)); -- Case-insensitive search
CREATE INDEX IF NOT EXISTS idx_insurers_insurance_types ON insurers USING GIN(insurance_types);
CREATE INDEX IF NOT EXISTS idx_insurers_created_at ON insurers(created_at DESC);

-- Indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_insurer_id ON documents(insurer_id);
CREATE INDEX IF NOT EXISTS idx_documents_insurance_type ON documents(insurance_type);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN(metadata); -- For JSONB queries

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_insurer_type ON documents(insurer_id, insurance_type);

-- Indexes for document_chunks table
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_insurer_id ON document_chunks(insurer_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_created_at ON document_chunks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_metadata ON document_chunks USING GIN(metadata); -- For JSONB queries

-- Composite index for ordering chunks within a document
CREATE INDEX IF NOT EXISTS idx_chunks_document_chunk_order ON document_chunks(document_id, chunk_index);

-- =============================================================================
-- STEP 4: Create Vector Index (IVFFlat)
-- =============================================================================

-- IVFFlat index for fast vector similarity search (cosine distance)
-- Lists parameter: sqrt(number of rows) is a good starting point
-- For initial setup: 100 lists (good for ~10k rows)
-- Adjust based on your dataset size:
--   - 10K rows: lists = 100
--   - 100K rows: lists = 300
--   - 1M rows: lists = 1000

CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- NOTE: You may need to rebuild this index as your dataset grows
-- Command to rebuild: DROP INDEX idx_chunks_embedding_ivfflat; then recreate with adjusted lists

-- =============================================================================
-- STEP 5: Create Functions
-- =============================================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vector similarity search function
-- Returns most similar chunks to a query embedding
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
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Search similar chunks filtered by insurer
CREATE OR REPLACE FUNCTION search_similar_chunks_by_insurer(
  query_embedding VECTOR(768),
  target_insurer_id UUID,
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  insurer_id UUID,
  chunk_text TEXT,
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
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE dc.insurer_id = target_insurer_id
    AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if pgvector extension is installed
CREATE OR REPLACE FUNCTION check_pgvector_extension()
RETURNS BOOLEAN AS $$
DECLARE
  extension_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) INTO extension_exists;
  
  RETURN extension_exists;
END;
$$ LANGUAGE plpgsql;

-- Get document context by retrieving surrounding chunks
CREATE OR REPLACE FUNCTION get_document_context(
  target_chunk_id UUID,
  context_window INTEGER DEFAULT 2
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  is_target BOOLEAN
) AS $$
DECLARE
  target_doc_id UUID;
  target_index INTEGER;
BEGIN
  -- Get document_id and chunk_index of target chunk
  SELECT document_id, chunk_index INTO target_doc_id, target_index
  FROM document_chunks
  WHERE id = target_chunk_id;
  
  -- Return surrounding chunks
  RETURN QUERY
  SELECT
    dc.id,
    dc.chunk_text,
    dc.chunk_index,
    dc.id = target_chunk_id AS is_target
  FROM document_chunks dc
  WHERE dc.document_id = target_doc_id
    AND dc.chunk_index >= target_index - context_window
    AND dc.chunk_index <= target_index + context_window
  ORDER BY dc.chunk_index;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 6: Create Triggers
-- =============================================================================

-- Automatically update updated_at on insurers
CREATE TRIGGER update_insurers_updated_at
  BEFORE UPDATE ON insurers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Automatically update updated_at on documents
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 7: Verification Queries
-- =============================================================================

-- Verify tables were created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('insurers', 'documents', 'document_chunks')
ORDER BY tablename;

-- Verify indexes were created
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('insurers', 'documents', 'document_chunks')
ORDER BY indexname;

-- Verify pgvector extension
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Verify functions were created
SELECT proname FROM pg_proc 
WHERE proname IN ('search_similar_chunks', 'search_similar_chunks_by_insurer', 'get_document_context', 'update_updated_at_column')
ORDER BY proname;

-- Verify triggers were created
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =============================================================================
-- STEP 8: Grant Permissions (if needed)
-- =============================================================================

-- Grant permissions to application user (replace 'app_user' with your role)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON insurers TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON document_chunks TO app_user;
-- GRANT EXECUTE ON FUNCTION search_similar_chunks TO app_user;
-- GRANT EXECUTE ON FUNCTION search_similar_chunks_by_insurer TO app_user;
-- GRANT EXECUTE ON FUNCTION get_document_context TO app_user;

-- =============================================================================
-- Migration Complete!
-- =============================================================================

-- Next Steps:
-- 1. Verify all objects were created using the verification queries above
-- 2. Insert sample data to test the schema
-- 3. Test vector similarity search with sample embeddings
-- 4. Monitor index performance as data grows
-- 5. Adjust IVFFlat lists parameter if needed (see comments above)
