-- ========================================
-- COMPLETE DATABASE SCHEMA SETUP
-- German Insurance Backend - RAG System
-- ========================================
-- Run this entire script in your new Supabase SQL Editor
-- This will create all tables, indexes, functions, and triggers
-- ========================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- DROP EXISTING TABLES (if any)
-- ========================================
-- Uncomment these lines if you need to start fresh
-- WARNING: This will delete all existing data!

-- DROP TABLE IF EXISTS document_chunks CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS insurers CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- CREATE TABLES
-- ========================================

-- Table 1: INSURERS
-- Stores information about insurance companies
CREATE TABLE IF NOT EXISTS insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  website VARCHAR(500),
  insurance_types TEXT[], -- Array of insurance types offered (e.g., ['health', 'life', 'auto'])
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: DOCUMENTS
-- Stores insurance documents and policies
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(insurer_id, title) -- Prevent duplicate document titles per insurer
);

-- Table 3: DOCUMENT_CHUNKS
-- Stores text chunks with embeddings for RAG (Retrieval-Augmented Generation)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Position of chunk in original document
  token_count INTEGER, -- Number of tokens in chunk
  embedding VECTOR(768), -- 768-dimensional embedding vector (for sentence-transformers)
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional chunk metadata (page number, section, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_chunk_index_non_negative CHECK (chunk_index >= 0),
  CONSTRAINT check_token_count_positive CHECK (token_count IS NULL OR token_count > 0)
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Indexes for INSURERS table
CREATE INDEX IF NOT EXISTS idx_insurers_name ON insurers(name);
CREATE INDEX IF NOT EXISTS idx_insurers_insurance_types ON insurers USING GIN(insurance_types);

-- Indexes for DOCUMENTS table
CREATE INDEX IF NOT EXISTS idx_documents_insurer_id ON documents(insurer_id);
CREATE INDEX IF NOT EXISTS idx_documents_insurance_type ON documents(insurance_type);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

-- Indexes for DOCUMENT_CHUNKS table
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_insurer_id ON document_chunks(insurer_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(chunk_index);

-- IVFFlat index for fast vector similarity search using cosine distance
-- This is crucial for RAG performance
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ========================================
-- CREATE FUNCTIONS
-- ========================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE TRIGGERS
-- ========================================

-- Trigger to auto-update updated_at for insurers table
CREATE TRIGGER update_insurers_updated_at
  BEFORE UPDATE ON insurers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at for documents table
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these after the setup to verify everything is created correctly

-- Check all tables
SELECT 
  'Tables Created' as status,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('insurers', 'documents', 'document_chunks');

-- Check all indexes
SELECT 
  'Indexes Created' as status,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('insurers', 'documents', 'document_chunks');

-- Check pgvector extension
SELECT 
  'pgvector Extension' as status,
  CASE WHEN COUNT(*) > 0 THEN 'Enabled' ELSE 'Not Enabled' END as extension_status
FROM pg_extension 
WHERE extname = 'vector';

-- ========================================
-- SAMPLE TEST DATA (OPTIONAL)
-- ========================================
-- Uncomment to insert sample data for testing

/*
-- Insert sample insurer
INSERT INTO insurers (name, description, website, insurance_types, contact_email)
VALUES (
  'Allianz Deutschland',
  'Leading German insurance company offering comprehensive coverage',
  'https://www.allianz.de',
  ARRAY['health', 'life', 'auto', 'home'],
  'kontakt@allianz.de'
) RETURNING id, name;

-- Insert sample document (replace INSURER_ID with the ID from above)
INSERT INTO documents (
  insurer_id, 
  title, 
  insurance_type, 
  document_type, 
  language
)
VALUES (
  'REPLACE_WITH_INSURER_ID',
  'Krankenversicherung Bedingungen 2024',
  'health',
  'policy',
  'de'
) RETURNING id, title;

-- Insert sample chunk (replace DOCUMENT_ID and INSURER_ID)
INSERT INTO document_chunks (
  document_id,
  insurer_id,
  chunk_text,
  chunk_index,
  token_count
)
VALUES (
  'REPLACE_WITH_DOCUMENT_ID',
  'REPLACE_WITH_INSURER_ID',
  'Dies ist ein Beispieltext für einen Dokumenten-Chunk. Er enthält Informationen über Krankenversicherungsbedingungen.',
  0,
  20
) RETURNING id, chunk_index;
*/

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Your database is now ready for the German Insurance RAG system
-- 
-- Next steps:
-- 1. Verify tables were created (run verification queries above)
-- 2. Update your .env file with new Supabase credentials
-- 3. Test connection from your Node.js application
-- 4. Load your insurance data using upload scripts
-- 5. Test RAG queries with vector search
-- ========================================
