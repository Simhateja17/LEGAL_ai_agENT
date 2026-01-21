# Database Setup Guide

## Current Status

✅ **Completed:**
- Database query module created (`src/db/queries.js`)
- Functions implemented:
  - `insertInsurer` - Add insurer records with duplicate detection
  - `insertDocument` - Add document records with validation
  - `insertDocumentChunk` - Add single chunk with embedding
  - `bulkInsertChunks` - Efficient batch insertion
  - Helper functions for querying data
- Comprehensive error handling for duplicates and connection errors
- Test suite created

⚠️ **Pending:** Full database schema needs to be applied in Supabase

## Database Schema Status

The Supabase database currently has minimal tables:
- `insurers` table: Only has `id` and `name` columns
- `documents` table: Exists but needs full schema
- `document_chunks` table: **Does not exist yet**

## How to Complete the Setup

### Step 1: Apply Full Schema to Supabase

1. Go to your Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/vtmsosynpediclfycnni/sql/new
   ```

2. Copy and paste the following SQL:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop and recreate insurers table with all columns
DROP TABLE IF EXISTS insurers CASCADE;
CREATE TABLE insurers (
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

-- Drop and recreate documents table with all columns  
DROP TABLE IF EXISTS documents CASCADE;
CREATE TABLE documents (
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

-- Create document_chunks table
CREATE TABLE document_chunks (
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

-- Create indexes for performance
CREATE INDEX idx_insurers_name ON insurers(name);
CREATE INDEX idx_insurers_insurance_types ON insurers USING GIN(insurance_types);

CREATE INDEX idx_documents_insurer_id ON documents(insurer_id);
CREATE INDEX idx_documents_insurance_type ON documents(insurance_type);
CREATE INDEX idx_documents_document_type ON documents(document_type);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_insurer_id ON document_chunks(insurer_id);
CREATE INDEX idx_chunks_chunk_index ON document_chunks(chunk_index);

-- Create vector index for similarity search
CREATE INDEX idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_insurers_updated_at
  BEFORE UPDATE ON insurers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

3. Click **RUN** to execute the SQL

### Step 2: Verify the Schema

After applying the schema, run:

```bash
node verify-schema.js
```

You should see:
```
✅ Insurers table exists
✅ Documents table exists
✅ Document chunks table exists
```

### Step 3: Run Tests

Test the database query module:

```bash
node test-db-queries.js
```

Expected result:
```
Total Tests: 11
✅ Passed: 11
❌ Failed: 0
Success Rate: 100%
```

## Completion Checklist

Once the schema is applied and tests pass, you will have:

- [x] **insertInsurer function works correctly**
  - Validates required fields
  - Checks for duplicate names
  - Returns inserted record with ID

- [x] **insertDocument function works correctly**
  - Validates insurer exists
  - Checks for duplicate titles per insurer
  - Returns inserted record with ID

- [x] **Bulk insert function is implemented**
  - Processes chunks in configurable batches
  - Validates all data before insertion
  - Returns summary with success/failure counts

- [x] **Error handling covers common cases**
  - Duplicate records
  - Invalid foreign keys
  - Missing required fields
  - Invalid embedding dimensions
  - Database connection errors

- [x] **Functions are tested with sample data**
  - Comprehensive test suite
  - Tests all success and error paths
  - Validates data integrity

- [x] **Ready for data loading from cleaned files**
  - Can import insurers
  - Can import documents
  - Can bulk load chunks with embeddings

## Next Steps

After completing the database setup:

1. **Load Real Data:**
   ```bash
   node scripts/data-processing/04-upload-to-supabase.js
   ```

2. **Verify Data Loaded:**
   ```bash
   node verify-data-loaded.js
   ```

3. **Test RAG System:**
   - Start the server: `npm start`
   - Test query endpoint: `POST /api/query`

## File Reference

- **Query Module:** `src/db/queries.js`
- **Test Suite:** `test-db-queries.js`
- **Schema Files:** 
  - `db/schema.sql` (reference)
  - `db/migrations/001_initial_schema.sql` (detailed version)
- **Setup Utilities:**
  - `verify-schema.js`
  - `setup-tables.js`
  - `check-schema.js`

## Support

If you encounter issues:

1. Check Supabase logs in the dashboard
2. Verify `.env` file has correct credentials
3. Ensure pgvector extension is enabled
4. Check that all tables are created with `verify-schema.js`
