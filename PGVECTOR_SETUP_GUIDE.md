# pgvector Setup & Verification Guide

## 🎯 Current Status

The test shows that the `document_chunks` table with vector column **does not exist yet** in your Supabase database. You need to apply the schema first.

## ✅ Step-by-Step Setup

### Step 1: Apply Database Schema in Supabase

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/vtmsosynpediclfycnni/sql/new
   ```

2. **Copy and paste this complete SQL:**

```sql
-- ============================================================================
-- Complete pgvector Schema Setup
-- ============================================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Drop existing tables if you want a fresh start (CAREFUL!)
-- Uncomment these lines only if you want to reset everything:
-- DROP TABLE IF EXISTS document_chunks CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS insurers CASCADE;

-- Step 3: Create insurers table
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

-- Step 4: Create documents table
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

-- Step 5: Create document_chunks table with VECTOR column
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  embedding VECTOR(768),  -- 768-dimensional vector for embeddings
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_chunk_index_non_negative CHECK (chunk_index >= 0),
  CONSTRAINT check_token_count_positive CHECK (token_count IS NULL OR token_count > 0)
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insurers_name ON insurers(name);
CREATE INDEX IF NOT EXISTS idx_insurers_insurance_types ON insurers USING GIN(insurance_types);

CREATE INDEX IF NOT EXISTS idx_documents_insurer_id ON documents(insurer_id);
CREATE INDEX IF NOT EXISTS idx_documents_insurance_type ON documents(insurance_type);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_insurer_id ON document_chunks(insurer_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(chunk_index);

-- Step 7: Create VECTOR INDEX (IVFFlat) for fast similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 8: Create helper function for similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  insurer_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.insurer_id,
    document_chunks.chunk_text,
    document_chunks.chunk_index,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity,
    document_chunks.metadata
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 9: Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_insurers_updated_at
  BEFORE UPDATE ON insurers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ✅ Schema setup complete!
```

3. **Click RUN** to execute the SQL

4. **Verify completion:**
   - You should see "Success. No rows returned" or similar
   - Check the Tables section in Supabase dashboard
   - You should see: `insurers`, `documents`, `document_chunks`

### Step 2: Verify pgvector Extension

Run this in SQL Editor:

```sql
-- Check extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector operations
SELECT '[1,2,3]'::vector <=> '[1,0,0]'::vector AS cosine_distance;

-- Check vector column
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'document_chunks' 
  AND column_name = 'embedding';
```

Expected output:
- Extension row with `extname = 'vector'`
- Cosine distance calculation works
- Column shows `USER-DEFINED` type (vector)

### Step 3: Run Verification Test

After applying the schema, run:

```bash
node test-pgvector.js
```

Expected output:
```
✅ pgvector VERIFICATION COMPLETE!

📋 Completion Checklist:
   ✓ pgvector extension is confirmed enabled
   ✓ Vector column exists with correct dimensions (768)
   ✓ Test vector can be inserted successfully
   ✓ Vector similarity query works
   ✓ Configuration is documented
   ✓ Ready for embedding insertion
```

## 📋 Verification Checklist

After setup, verify each item:

- [ ] **pgvector extension is confirmed enabled**
  - Run: `SELECT * FROM pg_extension WHERE extname = 'vector';`
  - Should return 1 row

- [ ] **Vector column exists with correct dimensions (768)**
  - Table: `document_chunks`
  - Column: `embedding`
  - Type: `VECTOR(768)`

- [ ] **Test vector can be inserted successfully**
  - Run: `node test-pgvector.js`
  - Test 3 should pass

- [ ] **Vector similarity query works**
  - Cosine distance operator: `<=>`
  - Function: `match_document_chunks()`

- [ ] **Configuration is documented**
  - This file
  - `db/schema.sql`
  - `db/verify-pgvector.sql`

- [ ] **Ready for embedding insertion**
  - All tests passing
  - Index created
  - Functions available

## 🔍 Testing Vector Operations

### Test 1: Insert a Test Vector

```javascript
import supabase from './src/db/supabase.js';
import { generateEmbedding } from './src/services/embedding.service.js';

// Create test insurer
const { data: insurer } = await supabase
  .from('insurers')
  .insert([{ name: 'Test Insurer' }])
  .select()
  .single();

// Create test document
const { data: doc } = await supabase
  .from('documents')
  .insert([{
    insurer_id: insurer.id,
    title: 'Test Document'
  }])
  .select()
  .single();

// Generate embedding
const embedding = await generateEmbedding("Test text");

// Insert chunk with embedding
const { data: chunk } = await supabase
  .from('document_chunks')
  .insert([{
    document_id: doc.id,
    insurer_id: insurer.id,
    chunk_text: 'Test chunk',
    chunk_index: 0,
    embedding: embedding
  }])
  .select()
  .single();

console.log('✅ Vector inserted:', chunk.id);
```

### Test 2: Query Similar Vectors

```javascript
// Generate query embedding
const queryEmbedding = await generateEmbedding("Search query");

// Find similar chunks
const { data: similar } = await supabase.rpc('match_document_chunks', {
  query_embedding: queryEmbedding,
  match_threshold: 0.7,
  match_count: 5
});

console.log('Similar chunks:', similar);
```

## 🎯 Index Configuration

### IVFFlat Index (Current)

```sql
CREATE INDEX idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Configuration:**
- `lists = 100`: Good for ~10,000 rows
- Adjust based on data size:
  - 10k rows: lists = 100
  - 100k rows: lists = 300
  - 1M rows: lists = 1000

### HNSW Index (Alternative - Faster, More Memory)

```sql
CREATE INDEX idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**When to use:**
- Need faster queries
- Have more memory available
- Don't mind longer build time

## 📊 Performance Tips

1. **Build index after bulk insert:**
   - Insert all vectors first
   - Then create index
   - Faster than indexing during insert

2. **Monitor index usage:**
```sql
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_scan, 
  idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename = 'document_chunks';
```

3. **Adjust lists parameter:**
```sql
-- Reindex with new lists value
DROP INDEX idx_chunks_embedding_ivfflat;
CREATE INDEX idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 300);  -- Adjusted for more data
```

## 🚨 Common Issues & Solutions

### Issue 1: "extension vector does not exist"
**Solution:**
```sql
CREATE EXTENSION vector;
```

### Issue 2: "table document_chunks does not exist"
**Solution:** Apply schema from Step 1 above

### Issue 3: "column embedding does not exist"
**Solution:** Schema not fully applied - run complete SQL from Step 1

### Issue 4: Slow similarity queries
**Solution:** 
- Check index exists: `\d document_chunks`
- Rebuild index with proper lists value
- Use HNSW instead of IVFFlat

### Issue 5: "Cannot insert vector dimension mismatch"
**Solution:** 
- Ensure embedding is exactly 768 dimensions
- Check: `console.log(embedding.length)`
- Vertex AI textembedding-gecko@003 returns 768 dims

## 🎉 Next Steps After Setup

Once all tests pass:

1. **Load Document Data:**
```bash
npm run process:clean    # Clean raw documents
npm run process:chunk    # Split into chunks
npm run process:embed    # Generate embeddings
npm run process:upload   # Upload to Supabase
```

2. **Test RAG Queries:**
```bash
# Start server
npm start

# Test query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Was ist Krankenversicherung?"}'
```

3. **Monitor Performance:**
- Check query times in Supabase dashboard
- Monitor index usage
- Adjust lists parameter if needed

---

**Status:** Setup guide complete. Apply the SQL in Supabase, then run `node test-pgvector.js` to verify.
