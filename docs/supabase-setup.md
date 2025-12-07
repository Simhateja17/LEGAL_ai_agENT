# Supabase Setup Guide - Complete Database Configuration

**Task 12 (Day 12)**: Complete Supabase Database Setup and Connection

**Owner**: Surendra (Database Admin)  
**Backend Integration**: Poojitha (Backend Developer)  
**Date**: 2024  
**Status**: Ready for Execution

---

## Overview

This comprehensive guide provides step-by-step instructions for setting up the Supabase PostgreSQL database for the German Insurance AI Backend project. This guide covers:

- Supabase project creation
- pgvector extension setup
- Database schema migration
- Security configuration
- Credential sharing
- Backend connection testing
- Troubleshooting common issues

**Prerequisites:**
- Supabase account (free tier sufficient)
- Git repository access
- Access to project migration scripts

---

This guide walks you through setting up Supabase with pgvector for the German Insurance AI Agent backend.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create a new account
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `german-insurance-backend` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select the closest region to your users (e.g., Europe Central for Germany)
   - **Pricing Plan**: Free tier works for development
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to be provisioned

## 2. Enable pgvector Extension

pgvector is required for storing and querying vector embeddings.

1. In your Supabase project dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Paste the following SQL command:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Click **"Run"** or press `Ctrl+Enter`
5. You should see a success message

### Why pgvector?
pgvector adds support for vector similarity search in PostgreSQL, enabling efficient semantic search for RAG applications.

## 3. Test Vector Functionality

Verify that pgvector is working correctly:

1. In the SQL Editor, create a new query
2. Run the following test command:

```sql
SELECT '[1,2,3]'::vector;
```

3. Expected output:
```
vector
--------
[1,2,3]
```

If you see this output, pgvector is successfully installed!

### Additional Test Queries

Test vector operations:

```sql
-- Create a test table with vectors
CREATE TABLE test_vectors (
  id SERIAL PRIMARY KEY,
  embedding VECTOR(3)
);

-- Insert test data
INSERT INTO test_vectors (embedding) VALUES 
  ('[1,2,3]'),
  ('[4,5,6]'),
  ('[7,8,9]');

-- Test cosine similarity search
SELECT id, embedding, 
  embedding <=> '[1,2,3]' AS distance
FROM test_vectors
ORDER BY distance
LIMIT 3;

-- Clean up test table
DROP TABLE test_vectors;
```

## 4. Run Database Migrations (Surendra)

### Step 1: Find Your API Keys

Before running migrations, note your credentials for later:

1. In Supabase dashboard, navigate to: **Settings** → **API**
2. Copy these values:

**Project URL**
```
https://xxxxxxxxxxxxx.supabase.co
```
- This is your `SUPABASE_URL`

**Service Role Key** (secret) ⚠️
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- Has admin privileges
- Use for backend server
- This is your `SUPABASE_KEY`

⚠️ **Security**: Never commit keys to Git, share publicly, or expose in frontend code.

### Step 2: Run Initial Schema Migration

1. **Open SQL Editor** in Supabase dashboard
2. **Open Migration File**: `db/migrations/001_initial_schema.sql` from Git repository
3. **Copy Entire Contents** (250+ lines)
4. **Paste** into Supabase SQL Editor
5. **Execute**: Click "Run" or press `Ctrl+Enter`
6. **Wait**: 5-10 seconds for completion

**Expected Output:**
```
Success. No rows returned
```

This migration creates:
- ✅ 3 tables: `insurers`, `insurance_products`, `insurance_chunks`
- ✅ 20+ indexes (including IVFFlat vector index)
- ✅ 4 PostgreSQL functions for search and queries
- ✅ 2 triggers for automatic timestamps

### Step 3: Verify Schema Creation

Run this verification query:

```sql
-- Verify all tables created
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('insurers', 'insurance_products', 'insurance_chunks')
ORDER BY table_name;
```

**Expected Output:**
```
table_name          | table_type
--------------------|------------
insurance_chunks    | BASE TABLE
insurance_products  | BASE TABLE
insurers            | BASE TABLE
```

### Step 4: Verify Indexes

```sql
-- Verify indexes created
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected**: 20+ indexes including:
- `idx_chunks_embedding_ivfflat` (vector index)
- `idx_chunks_product_id`
- `idx_products_insurer_id`
- Various other performance indexes

### Step 5: Verify Functions

```sql
-- Verify functions created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'search_insurance_chunks',
    'get_insurer_products',
    'get_product_chunks',
    'check_pgvector_extension'
  );
```

**Expected Functions:**
- `search_insurance_chunks` - Vector similarity search
- `get_insurer_products` - Get products by insurer
- `get_product_chunks` - Get chunks by product
- `check_pgvector_extension` - Verify pgvector installed

### Step 6: Load Sample Data (Optional)

1. **Open Migration File**: `db/migrations/002_sample_data.sql`
2. **Copy and Paste** into SQL Editor
3. **Execute**: Click "Run"
4. **Verify Sample Data**:

```sql
-- Check data counts
SELECT 
  (SELECT COUNT(*) FROM insurers) AS insurers_count,
  (SELECT COUNT(*) FROM insurance_products) AS products_count,
  (SELECT COUNT(*) FROM insurance_chunks) AS chunks_count;
```

**Expected Output:**
```
insurers_count | products_count | chunks_count
---------------|----------------|-------------
3              | 9              | 27
```

Sample data includes:
- 3 German insurers (Allianz, AXA, Munich Re)
- 9 insurance products (health, auto, home insurance)
- 27 text chunks with embeddings

## 5. Share Credentials with Poojitha (Surendra)

### Prepare Credentials Document

Create a secure document with:

```env
# Supabase Credentials - German Insurance Backend
# Created: [DATE]
# Project: german-insurance-backend

SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_KEY=[your-service-role-key]

# Database Connection (for direct access if needed)
Database Host: db.[your-project-id].supabase.co
Database Port: 5432
Database Name: postgres
Database User: postgres
Database Password: [your-database-password]

# Project Info
Region: [e.g., eu-central-1]
Created: [DATE]
Status: ✅ Schema deployed
```

### Secure Sharing Methods

**Option 1: Encrypted Messaging** (Recommended)
- Use Signal, Telegram (secret chat), or WhatsApp
- Send URL and KEY in separate messages
- Delete after Poojitha confirms receipt

**Option 2: Password-Protected File**
- Create encrypted ZIP or use password manager
- Share file via email/cloud
- Share password via separate channel

**Option 3: Environment Variable Service**
- Use Doppler, Vault, or 1Password Teams
- Grant Poojitha access

**❌ Do NOT:**
- Send via plain email
- Commit to Git
- Share via unencrypted Slack/Teams
- Store in public Google Docs

### Verification Checklist for Poojitha

```
✅ SUPABASE_URL received
✅ SUPABASE_KEY received
✅ Added to .env file (NOT .env.example)
✅ Verified .env is in .gitignore
✅ Ran test-connection.js successfully
✅ Backend server starts without errors
```

## 6. Backend Integration (Poojitha)

### Step 1: Configure Environment

1. **Create .env file** from template:
   ```bash
   cp .env.example .env
   ```

2. **Edit .env** with credentials from Surendra:
   ```env
   PORT=3000
   
   # Supabase Configuration
   SUPABASE_URL=https://[from-surendra].supabase.co
   SUPABASE_KEY=[from-surendra]
   
   # Vertex AI (add later in Task 13)
   VERTEX_AI_PROJECT_ID=your-project-id
   # ... other config ...
   ```

3. **Verify .env is in .gitignore**:
   ```bash
   cat .gitignore | grep ".env"
   ```

### Step 2: Test Database Connection

Run the comprehensive connection test:

```bash
node test-connection.js
```

**Expected Output:**
```
🔍 Testing Supabase Connection...
============================================================
✅ Environment variables found:
   SUPABASE_URL: https://...
   SUPABASE_KEY: eyJ...
============================================================

📡 Attempting to connect to Supabase...

1️⃣  Testing database connection...
   ✅ Database connection successful!

2️⃣  Checking pgvector extension...
   ✅ pgvector extension: Installed

3️⃣  Checking schema tables...
   Table Status:
     - insurers: ✅ Exists
     - insurance_products: ✅ Exists
     - insurance_chunks: ✅ Exists

4️⃣  Checking sample data...
   ✅ Sample data loaded: 3 records in insurers table

5️⃣  Testing vector operations...
   ✅ Vector operations table ready

============================================================
✅ CONNECTION TEST COMPLETE
============================================================

📊 Summary:
   Connection: ✅ Successful
   Database URL: https://...
   Tables: ✅ Ready
   pgvector: ✅ Ready

📋 Next Steps:
   1. Start the backend server: npm run dev
   2. Test API health: curl http://localhost:3000/api/health
   3. Test insurers endpoint: curl http://localhost:3000/api/insurers
   4. Begin data ingestion: see scripts/data-processing/README.md
```

### Step 3: Start Backend Server

```bash
npm run dev
```

**Expected Output:**
```
✓ Supabase client initialized
  URL: https://xxx...
Server running on http://localhost:3000
```

### Step 4: Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Expected: {"status":"ok","timestamp":"2024-...","service":"german-insurance-backend"}

# List insurers
curl http://localhost:3000/api/insurers

# Expected: [{"id":"...","name":"Allianz",...}, ...]
```

## 7. Troubleshooting

### Connection Test Fails

**Symptom**: `test-connection.js` shows connection errors

**Solutions**:
1. Verify SUPABASE_URL has no trailing slash
2. Check SUPABASE_KEY is service_role key (not anon key)
3. Ensure .env file is in project root
4. Restart terminal after editing .env
5. Check Supabase project is not paused

### Tables Not Found

**Symptom**: `Error: relation "insurers" does not exist`

**Solutions**:
1. Verify migration was run: Check SQL Editor history
2. Re-run `001_initial_schema.sql`
3. Check you're connected to correct project
4. Verify tables in Supabase Table Editor

### pgvector Extension Missing

**Symptom**: `extension "vector" is not available`

**Solutions**:
1. Run: `CREATE EXTENSION IF NOT EXISTS vector;`
2. Verify PostgreSQL version is 15+
3. Contact Supabase support if unavailable
4. Check extension in SQL: `SELECT * FROM pg_extension WHERE extname = 'vector';`

### Backend Server Won't Start

**Symptom**: Server crashes on startup

**Solutions**:
1. Check .env file exists and has SUPABASE_URL and SUPABASE_KEY
2. Verify no syntax errors in .env (no quotes needed)
3. Check port 3000 is not already in use
4. Run: `npm install` to ensure dependencies installed

## 8. Next Steps

### Immediate Tasks

1. ✅ Supabase project created
2. ✅ pgvector extension enabled
3. ✅ Schema migrated
4. ✅ Backend connected
5. 🔄 Begin data ingestion (Task 13)
6. 🔄 Implement embeddings (Task 14)
7. 🔄 Test RAG pipeline (Task 15)

### Documentation References

- **Migration Scripts**: `db/migrations/`
- **Schema Design**: `docs/day2-schema-design.md`
- **Schema Implementation**: `docs/day9-schema-finalization.md`
- **Data Processing**: `scripts/data-processing/README.md`
- **Coordination Guide**: `docs/coordination-guide.md`

### Team Coordination

- **Surendra**: Monitor database health, manage backups, assist with query optimization
- **Poojitha**: Implement API endpoints, integrate Vertex AI, test RAG pipeline

---

**Task 12 Complete**: Database setup and backend connection established!  
**Next Task**: Task 13 - Data Ingestion Pipeline

## Troubleshooting

### Error: "extension 'vector' does not exist"
- Make sure you ran `CREATE EXTENSION IF NOT EXISTS vector;`
- pgvector should be available by default in Supabase

### Error: "relation 'document_chunks' does not exist"
- Ensure you ran the full `schema.sql` file
- Check the SQL Editor for any error messages

### Connection errors from Node.js
- Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Check that `.env` file is in the project root
- Restart your Node.js server after updating `.env`

### Vector operations are slow
- Make sure the IVFFlat index was created
- Run `VACUUM ANALYZE document_chunks;` to update statistics
- Consider increasing the `lists` parameter in the index for larger datasets

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Vector Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [Vector Similarity Search Best Practices](https://supabase.com/docs/guides/ai/choosing-an-index)
