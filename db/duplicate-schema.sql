-- ========================================
-- DUPLICATE SCHEMA FOR SUPABASE
-- ========================================
-- This script creates duplicate tables of your existing schema
-- 
-- OPTION 1: Create tables with "_backup" suffix (recommended for safety)
-- OPTION 2: Drop and recreate existing tables (use with caution!)
--
-- Choose ONE option below and run it in Supabase SQL Editor
-- ========================================

-- ========================================
-- OPTION 1: CREATE BACKUP TABLES (SAFE)
-- ========================================
-- This creates new tables with "_backup" suffix without affecting existing data

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Insurers backup table
CREATE TABLE IF NOT EXISTS insurers_backup (
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

-- Documents backup table
CREATE TABLE IF NOT EXISTS documents_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id UUID REFERENCES insurers_backup(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  insurance_type VARCHAR(100), -- e.g., 'health', 'life', 'auto', 'home'
  document_type VARCHAR(100), -- e.g., 'policy', 'terms', 'faq', 'brochure'
  source_url VARCHAR(1000),
  file_path VARCHAR(500),
  language VARCHAR(10) DEFAULT 'de',
  metadata JSONB, -- Additional flexible metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks backup table
CREATE TABLE IF NOT EXISTS document_chunks_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents_backup(id) ON DELETE CASCADE,
  insurer_id UUID REFERENCES insurers_backup(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Position of chunk in original document
  token_count INTEGER, -- Number of tokens in chunk
  embedding VECTOR(768), -- 768-dimensional embedding vector
  metadata JSONB, -- Additional chunk metadata (page number, section, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for insurers_backup table
CREATE INDEX IF NOT EXISTS idx_insurers_backup_name ON insurers_backup(name);
CREATE INDEX IF NOT EXISTS idx_insurers_backup_insurance_types ON insurers_backup USING GIN(insurance_types);

-- Indexes for documents_backup table
CREATE INDEX IF NOT EXISTS idx_documents_backup_insurer_id ON documents_backup(insurer_id);
CREATE INDEX IF NOT EXISTS idx_documents_backup_insurance_type ON documents_backup(insurance_type);
CREATE INDEX IF NOT EXISTS idx_documents_backup_document_type ON documents_backup(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_backup_title ON documents_backup(title);

-- Indexes for document_chunks_backup table
CREATE INDEX IF NOT EXISTS idx_chunks_backup_document_id ON document_chunks_backup(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_backup_insurer_id ON document_chunks_backup(insurer_id);
CREATE INDEX IF NOT EXISTS idx_chunks_backup_chunk_index ON document_chunks_backup(chunk_index);

-- IVFFlat index for fast vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_chunks_backup_embedding_ivfflat 
ON document_chunks_backup 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Triggers to automatically update updated_at for backup tables
CREATE TRIGGER update_insurers_backup_updated_at
  BEFORE UPDATE ON insurers_backup
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_backup_updated_at
  BEFORE UPDATE ON documents_backup
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Copy existing data to backup tables
-- Uncomment these lines if you want to copy your current data:
/*
INSERT INTO insurers_backup SELECT * FROM insurers;
INSERT INTO documents_backup SELECT * FROM documents;
INSERT INTO document_chunks_backup SELECT * FROM document_chunks;
*/


-- ========================================
-- OPTION 2: RECREATE ORIGINAL TABLES (CAUTION!)
-- ========================================
-- WARNING: This will DELETE all existing data!
-- Only use this if you want to start fresh

/*
-- Drop existing tables (this will delete all data!)
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS insurers CASCADE;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Insurers table: stores information about insurance companies
CREATE TABLE insurers (
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
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id UUID REFERENCES insurers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  insurance_type VARCHAR(100), -- e.g., 'health', 'life', 'auto', 'home'
  document_type VARCHAR(100), -- e.g., 'policy', 'terms', 'faq', 'brochure'
  source_url VARCHAR(1000),
  file_path VARCHAR(500),
  language VARCHAR(10) DEFAULT 'de',
  metadata JSONB, -- Additional flexible metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table: stores text chunks with embeddings for RAG
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  insurer_id UUID REFERENCES insurers(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Position of chunk in original document
  token_count INTEGER, -- Number of tokens in chunk
  embedding VECTOR(768), -- 768-dimensional embedding vector
  metadata JSONB, -- Additional chunk metadata (page number, section, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for insurers table
CREATE INDEX idx_insurers_name ON insurers(name);
CREATE INDEX idx_insurers_insurance_types ON insurers USING GIN(insurance_types);

-- Indexes for documents table
CREATE INDEX idx_documents_insurer_id ON documents(insurer_id);
CREATE INDEX idx_documents_insurance_type ON documents(insurance_type);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_title ON documents(title);

-- Indexes for document_chunks table
CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_insurer_id ON document_chunks(insurer_id);
CREATE INDEX idx_chunks_chunk_index ON document_chunks(chunk_index);

-- IVFFlat index for fast vector similarity search (cosine distance)
CREATE INDEX idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_insurers_updated_at
  BEFORE UPDATE ON insurers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample query function for vector similarity search
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
*/
