/**
 * Setup Database Tables
 * 
 * Creates tables programmatically using Supabase client
 * Note: This is a workaround since we can't run raw SQL via JS client
 */

import supabase from './src/db/supabase.js';

async function setupTables() {
  console.log('🔧 Setting up database tables...\n');

  try {
    // Since we can't create tables via the JS client, let's verify if they exist
    // and provide instructions for manual setup
    
    console.log('Checking existing tables...\n');
    
    // Check insurers
    const { data: insurers, error: e1 } = await supabase
      .from('insurers')
      .select('id')
      .limit(0);
    
    console.log(e1 ? `❌ insurers: ${e1.message}` : '✅ insurers table exists');
    
    // Check documents
    const { data: documents, error: e2 } = await supabase
      .from('documents')
      .select('id')
      .limit(0);
    
    console.log(e2 ? `❌ documents: ${e2.message}` : '✅ documents table exists');
    
    // Check document_chunks
    const { data: chunks, error: e3 } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(0);
    
    console.log(e3 ? `❌ document_chunks: ${e3.message}` : '✅ document_chunks table exists');
    
    if (e3) {
      console.log('\n📝 TO CREATE MISSING TABLES:');
      console.log('Go to: https://supabase.com/dashboard/project/vtmsosynpediclfycnni/sql/new');
      console.log('Then run the following SQL:\n');
      console.log('-----------------------------------------------');
      console.log(`
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table
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
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_insurer_id ON document_chunks(insurer_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
      `);
      console.log('-----------------------------------------------\n');
    } else {
      console.log('\n✅ All tables are set up correctly!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupTables();
