# Supabase Connection Guide

## Quick Setup

Your Supabase project URL: `https://kxplqylfijtyhcmcbpae.supabase.co`

### Step 1: Get Your API Keys

1. Go to https://supabase.com/dashboard/project/kxplqylfijtyhcmcbpae/settings/api
2. Copy your **anon/public** key
3. Copy your **service_role** key (keep this secret!)

### Step 2: Update .env File

Replace the placeholders in your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://kxplqylfijtyhcmcbpae.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY_HERE          # ← Paste your anon key
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY_HERE  # ← Paste your service role key

# PostgreSQL Direct Connection (for migrations)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.kxplqylfijtyhcmcbpae.supabase.co:5432/postgres
```

Replace `[YOUR-PASSWORD]` with your actual database password.

### Step 3: Set Up pgvector Extension

Run this SQL in Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create insurers table
CREATE TABLE IF NOT EXISTS insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create insurance_documents table
CREATE TABLE IF NOT EXISTS insurance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id UUID REFERENCES insurers(id),
  insurer_name TEXT,
  insurance_type TEXT,
  document_title TEXT,
  content TEXT,
  chunk_text TEXT,
  embedding vector(768),  -- 768 dimensions for textembedding-gecko@003
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS insurance_documents_embedding_idx 
ON insurance_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create search function
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7,
  filter_insurance_type TEXT DEFAULT NULL,
  filter_insurer TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chunk_text TEXT,
  insurer_name TEXT,
  insurance_type TEXT,
  document_title TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    insurance_documents.id,
    insurance_documents.content,
    insurance_documents.chunk_text,
    insurance_documents.insurer_name,
    insurance_documents.insurance_type,
    insurance_documents.document_title,
    1 - (insurance_documents.embedding <=> query_embedding) AS similarity
  FROM insurance_documents
  WHERE 
    (filter_insurance_type IS NULL OR insurance_documents.insurance_type = filter_insurance_type)
    AND (filter_insurer IS NULL OR insurance_documents.insurer_name ILIKE '%' || filter_insurer || '%')
    AND (1 - (insurance_documents.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY insurance_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Step 4: Insert Sample Data (Optional)

```sql
-- Insert sample insurer
INSERT INTO insurers (name) VALUES 
  ('Allianz'),
  ('ERGO'),
  ('AXA');

-- You'll need to add actual documents with embeddings
-- This will be done through your data processing pipeline
```

### Step 5: Test Connection

Run this test script:

```bash
node -e "
import('dotenv').then(dotenv => {
  dotenv.config();
  import('@supabase/supabase-js').then(({ createClient }) => {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    supabase.from('insurers').select('*').then(({ data, error }) => {
      console.log('✅ Connection test:');
      console.log('Data:', data);
      console.log('Error:', error);
    });
  });
});
"
```

### Step 6: Restart Server

```bash
npm start
```

The RAG system will now automatically use Supabase for vector search instead of mock data!

## Troubleshooting

### Connection Errors

If you see `Missing Supabase credentials` warning:
- Double-check your `.env` file
- Make sure `SUPABASE_URL` and `SUPABASE_KEY` are set correctly
- Restart the server after updating `.env`

### No Results from Search

If searches return empty:
- Make sure you've uploaded document embeddings to the `insurance_documents` table
- Check that the `embedding` column has vector data
- Verify the similarity threshold (default 0.7) isn't too strict

### Permission Errors

If you get RLS (Row Level Security) errors:
- You may need to disable RLS for testing: `ALTER TABLE insurance_documents DISABLE ROW LEVEL SECURITY;`
- Or create appropriate RLS policies for your use case

## Data Processing Pipeline

To upload your insurance documents with embeddings:

1. Use the data processing scripts in `scripts/data-processing/`
2. Or create a custom upload script using the embedding service:

```javascript
import { generateEmbedding } from './src/services/embedding.service.js';
import supabase from './src/db/supabase.js';

async function uploadDocument(content, metadata) {
  const embedding = await generateEmbedding(content);
  
  const { data, error } = await supabase
    .from('insurance_documents')
    .insert({
      content,
      embedding,
      insurer_name: metadata.insurer,
      insurance_type: metadata.type,
      document_title: metadata.title
    });
  
  return { data, error };
}
```

## Next Steps

Once connected:
1. ✅ Supabase replaces mock data
2. ✅ Vector search uses pgvector
3. ✅ Production-ready RAG pipeline
4. Upload your actual insurance documents
5. Set `RAG_FALLBACK_MODE=false` in .env
