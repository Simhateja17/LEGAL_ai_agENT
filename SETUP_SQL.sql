-- ========================================
-- QUICK SETUP SQL FOR SUPABASE
-- Copy and paste this entire script into:
-- https://supabase.com/dashboard/project/kxplqylfijtyhcmcbpae/sql/new
-- ========================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create insurers table
CREATE TABLE IF NOT EXISTS insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  website VARCHAR(500),
  insurance_types TEXT[],
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  insurance_type VARCHAR(100),
  document_type VARCHAR(100),
  source_url VARCHAR(1000),
  file_path VARCHAR(500),
  language VARCHAR(10) DEFAULT 'de',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(insurer_id, title)
);

-- Create document_chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_chunk_index_non_negative CHECK (chunk_index >= 0),
  CONSTRAINT check_token_count_positive CHECK (token_count IS NULL OR token_count > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insurers_name ON insurers(name);
CREATE INDEX IF NOT EXISTS idx_insurers_insurance_types ON insurers USING GIN(insurance_types);
CREATE INDEX IF NOT EXISTS idx_documents_insurer_id ON documents(insurer_id);
CREATE INDEX IF NOT EXISTS idx_documents_insurance_type ON documents(insurance_type);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_insurer_id ON document_chunks(insurer_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create search function
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

-- Insert sample insurers for testing
INSERT INTO insurers (name, description, website, insurance_types, contact_email)
VALUES
  ('Allianz Deutschland', 'Leading German insurance company', 'https://www.allianz.de', 
   ARRAY['health', 'life', 'auto', 'home'], 'kontakt@allianz.de'),
  ('ERGO Versicherung', 'One of the largest insurance groups in Germany', 'https://www.ergo.de', 
   ARRAY['health', 'life', 'auto', 'home', 'travel'], 'service@ergo.de'),
  ('AXA Versicherung', 'International insurance company', 'https://www.axa.de', 
   ARRAY['health', 'life', 'auto', 'home'], 'kundenservice@axa.de')
ON CONFLICT (name) DO NOTHING;

-- Verify setup
SELECT 'Tables Created' as status, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('insurers', 'documents', 'document_chunks');

SELECT 'Insurers Loaded' as status, COUNT(*) as count FROM insurers;

SELECT 'pgvector Extension' as status, 
  CASE WHEN COUNT(*) > 0 THEN 'Enabled' ELSE 'Not Enabled' END as extension_status
FROM pg_extension WHERE extname = 'vector';

-- ✅ Setup complete! Now run: node test-supabase-connection.js
