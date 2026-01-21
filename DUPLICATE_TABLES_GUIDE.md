# Duplicate Tables in Supabase - Step-by-Step Guide

## Overview

You have 3 main tables in your Supabase database:
1. **`insurers`** - Insurance companies information
2. **`documents`** - Insurance documents and policies
3. **`document_chunks`** - Text chunks with embeddings for RAG search

This guide will help you create duplicate copies of these tables.

## 📋 What You Need

- Access to your Supabase Dashboard
- Your project URL: `https://supabase.com/dashboard/project/vtmsosynpediclfycnni`

## 🎯 Two Options Available

### Option 1: Create Backup Tables (RECOMMENDED) ✅

**What it does:**
- Creates new tables with `_backup` suffix
- **Preserves your existing data**
- Safe to run without data loss
- Tables created:
  - `insurers_backup`
  - `documents_backup`
  - `document_chunks_backup`

**When to use:**
- You want to keep your current data safe
- You want to test with duplicate tables
- You want a backup before making changes

### Option 2: Recreate Original Tables ⚠️

**What it does:**
- **DELETES all existing data**
- Drops and recreates the original tables
- Fresh start with empty tables

**When to use:**
- You want to start completely fresh
- You have backed up your data elsewhere
- You're sure you don't need the current data

## 🚀 How to Execute

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Choose Your Option

#### For Option 1 (Backup Tables - Safe):

1. Open the file: `db/duplicate-schema.sql`
2. Copy lines **1-109** (everything under "OPTION 1")
3. Paste into Supabase SQL Editor
4. Click **RUN** button

#### For Option 2 (Recreate Tables - Caution):

1. Open the file: `db/duplicate-schema.sql`
2. **Uncomment** lines **115-236** (remove the `/*` and `*/`)
3. Copy those lines
4. Paste into Supabase SQL Editor
5. **Double-check you want to delete existing data**
6. Click **RUN** button

### Step 3: Verify Tables Were Created

Run this query in Supabase SQL Editor:

```sql
-- Check if backup tables exist (for Option 1)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%backup%';

-- Or check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see your new tables listed!

## 📊 Table Structure Details

### insurers (or insurers_backup)
- **Columns:** id, name, description, website, insurance_types, contact_email, contact_phone, created_at, updated_at
- **Purpose:** Store insurance company information
- **Indexes:** name, insurance_types (GIN)

### documents (or documents_backup)
- **Columns:** id, insurer_id, title, insurance_type, document_type, source_url, file_path, language, metadata, created_at, updated_at
- **Purpose:** Store insurance policy documents
- **Indexes:** insurer_id, insurance_type, document_type, title
- **Foreign Key:** insurer_id → insurers(id)

### document_chunks (or document_chunks_backup)
- **Columns:** id, document_id, insurer_id, chunk_text, chunk_index, token_count, embedding, metadata, created_at
- **Purpose:** Store text chunks with vector embeddings for RAG search
- **Indexes:** document_id, insurer_id, chunk_index, embedding (IVFFlat)
- **Foreign Keys:** 
  - document_id → documents(id)
  - insurer_id → insurers(id)

## 🔄 Optional: Copy Existing Data to Backup Tables

If you chose Option 1 and want to copy your current data to the backup tables:

```sql
-- Copy all data from original tables to backup tables
INSERT INTO insurers_backup SELECT * FROM insurers;
INSERT INTO documents_backup SELECT * FROM documents;
INSERT INTO document_chunks_backup SELECT * FROM document_chunks;
```

## ✅ Verification Checklist

After running the SQL script, verify:

- [ ] All tables are created
- [ ] All indexes are created
- [ ] Foreign key relationships are working
- [ ] Triggers are set up (for updated_at columns)
- [ ] pgvector extension is enabled

Run this verification query:

```sql
-- Check table row counts
SELECT 
  'insurers_backup' as table_name, 
  COUNT(*) as row_count 
FROM insurers_backup
UNION ALL
SELECT 
  'documents_backup', 
  COUNT(*) 
FROM documents_backup
UNION ALL
SELECT 
  'document_chunks_backup', 
  COUNT(*) 
FROM document_chunks_backup;
```

## 🛠️ Troubleshooting

### Error: "extension vector does not exist"
**Solution:** Enable pgvector extension first:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "relation already exists"
**Solution:** Tables already exist. Either:
- Drop them first: `DROP TABLE table_name CASCADE;`
- Or use different table names

### Error: "foreign key constraint violation"
**Solution:** Make sure you create tables in the correct order:
1. insurers (or insurers_backup)
2. documents (or documents_backup)
3. document_chunks (or document_chunks_backup)

## 📝 Next Steps

After creating duplicate tables:

1. **Test with sample data:**
   ```bash
   node test-db-queries.js
   ```

2. **Load data into new tables:**
   - Modify your upload scripts to target the new table names
   - Or manually insert data via SQL

3. **Update your application code:**
   - If using backup tables, update table names in your queries
   - Update `src/db/queries.js` if needed

## 🔗 Related Files

- **Schema File:** `db/duplicate-schema.sql` (the SQL script to run)
- **Original Schema:** `db/schema.sql` (reference)
- **Database Setup:** `DATABASE_SETUP.md`
- **Query Module:** `src/db/queries.js`

## 💡 Tips

- Always test with Option 1 (backup tables) first
- Keep backups before running Option 2
- Use Supabase's built-in backup features for production data
- Monitor your database size - duplicate tables will use more storage

## ❓ Need Help?

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify your `.env` file has correct credentials
3. Ensure you have proper permissions in Supabase
4. Check the SQL error messages for specific issues
