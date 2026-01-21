# New Supabase Database Setup Guide

## 🎯 Objective
Create the exact same database structure in a new Supabase account.

**New Account Credentials:**
- Email: suriavula711@gmail.com
- Password: suriteja123

---

## 📋 Step-by-Step Instructions

### Step 1: Login to Supabase

1. Go to: https://supabase.com/dashboard
2. Click **Sign In**
3. Enter credentials:
   - Email: `suriavula711@gmail.com`
   - Password: `suriteja123`
4. Click **Sign In**

### Step 2: Create a New Project

1. After logging in, click **"New Project"** (or **"+ New project"**)
2. Fill in the project details:
   - **Name:** `german-insurance-backend` (or your preferred name)
   - **Database Password:** Choose a strong password (SAVE THIS!)
   - **Region:** Choose closest to you (e.g., `Europe (Frankfurt)` for Germany)
   - **Pricing Plan:** Free tier is fine for testing
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be provisioned

### Step 3: Save Your Connection Details

Once the project is created, you'll need these details:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **Database** tab
3. Save these values:
   - **Host:** (something like `db.xxxxx.supabase.co`)
   - **Database name:** `postgres`
   - **Port:** `5432`
   - **User:** `postgres`
   - **Password:** (the one you set in Step 2)
   - **Connection String:** Copy the full connection string

### Step 4: Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** (in left sidebar)
2. Click **"+ New query"**
3. Copy the ENTIRE contents of the file: `db/complete-schema-setup.sql` (created below)
4. Paste it into the SQL Editor
5. Click **RUN** (or press Ctrl+Enter)
6. Wait for execution to complete (should take 5-10 seconds)

### Step 5: Verify Tables Were Created

Run this verification query in the SQL Editor:

```sql
-- Check all tables
SELECT table_name, 
       (SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- ✅ `insurers` (9 columns)
- ✅ `documents` (10 columns)
- ✅ `document_chunks` (8 columns)

### Step 6: Verify Indexes

Run this query to check indexes:

```sql
-- Check all indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

You should see multiple indexes for each table.

### Step 7: Verify pgvector Extension

Run this query:

```sql
-- Check if pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';
```

You should see one row with `vector` extension.

### Step 8: Update Your .env File

Create a new `.env.new` file with your new Supabase credentials:

```env
# New Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY

# Database Connection (for direct PostgreSQL access)
DB_HOST=db.YOUR_PROJECT_REF.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_DATABASE_PASSWORD
```

**To find your keys:**
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (keep this secret!)

---

## 🔍 What Gets Created

### Tables

1. **insurers**
   - Stores insurance company information
   - Columns: id, name, description, website, insurance_types, contact_email, contact_phone, created_at, updated_at
   - Unique constraint on `name`

2. **documents**
   - Stores insurance policy documents
   - Columns: id, insurer_id, title, insurance_type, document_type, source_url, file_path, language, metadata, created_at, updated_at
   - Foreign key to `insurers`
   - Unique constraint on `(insurer_id, title)`

3. **document_chunks**
   - Stores text chunks with vector embeddings for RAG search
   - Columns: id, document_id, insurer_id, chunk_text, chunk_index, token_count, embedding, metadata, created_at
   - Foreign keys to both `documents` and `insurers`
   - Vector column for embeddings (768 dimensions)

### Indexes

- **insurers:** name, insurance_types (GIN)
- **documents:** insurer_id, insurance_type, document_type
- **document_chunks:** document_id, insurer_id, chunk_index, embedding (IVFFlat for vector search)

### Functions & Triggers

- `update_updated_at_column()` - Auto-updates `updated_at` timestamp
- Triggers on `insurers` and `documents` tables

### Extensions

- **pgvector** - For vector similarity search

---

## ✅ Verification Checklist

After setup, verify:

- [ ] All 3 tables created
- [ ] All indexes created (check with query above)
- [ ] pgvector extension enabled
- [ ] Triggers working (test by updating a record)
- [ ] Foreign key constraints working
- [ ] Can insert test data

---

## 🧪 Test the Setup

Run this test query to insert sample data:

```sql
-- Insert a test insurer
INSERT INTO insurers (name, description, website, insurance_types)
VALUES (
  'Test Insurance Company',
  'A test insurance company',
  'https://test-insurance.com',
  ARRAY['health', 'life']
)
RETURNING *;

-- Get the insurer ID from the result above, then insert a test document
INSERT INTO documents (insurer_id, title, insurance_type, document_type)
VALUES (
  'PASTE_INSURER_ID_HERE',
  'Test Policy Document',
  'health',
  'policy'
)
RETURNING *;

-- Clean up test data
DELETE FROM insurers WHERE name = 'Test Insurance Company';
```

---

## 🚨 Troubleshooting

### Error: "extension vector does not exist"
**Solution:** The pgvector extension isn't enabled. Run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "permission denied"
**Solution:** Make sure you're using the SQL Editor in Supabase dashboard, not a direct connection.

### Error: "relation already exists"
**Solution:** Tables already exist. Either:
- Drop them first: `DROP TABLE document_chunks, documents, insurers CASCADE;`
- Or skip the creation and just verify

### Error: "foreign key constraint violation"
**Solution:** Tables must be created in order:
1. insurers
2. documents
3. document_chunks

---

## 📊 Database Schema Diagram

```
┌─────────────┐
│  insurers   │
│─────────────│
│ id (PK)     │
│ name        │◄─────┐
│ description │      │
│ website     │      │
│ ...         │      │
└─────────────┘      │
                     │
                     │ (FK)
┌─────────────┐      │
│  documents  │      │
│─────────────│      │
│ id (PK)     │      │
│ insurer_id  │──────┘
│ title       │◄─────┐
│ ...         │      │
└─────────────┘      │
                     │ (FK)
┌──────────────────┐ │
│ document_chunks  │ │
│──────────────────│ │
│ id (PK)          │ │
│ document_id      │─┘
│ insurer_id       │
│ chunk_text       │
│ embedding (768D) │
│ ...              │
└──────────────────┘
```

---

## 🎉 Next Steps

After successful setup:

1. **Test the connection** from your Node.js app
2. **Load your data** using the upload scripts
3. **Verify data** was loaded correctly
4. **Test RAG queries** with vector search

---

## 📁 Related Files

- **Complete SQL Schema:** `db/complete-schema-setup.sql`
- **Original Schema:** `db/schema.sql`
- **Duplicate Schema:** `db/duplicate-schema.sql`
- **Database Setup Guide:** `DATABASE_SETUP.md`
- **Query Module:** `src/db/queries.js`

---

## 💡 Tips

- Save your database password in a secure password manager
- Keep your `service_role` key secret - never commit to git
- Use the `anon` key for client-side applications
- Monitor your database usage in the Supabase dashboard
- Set up database backups in production

---

## 📞 Need Help?

If you encounter issues:
1. Check the Supabase dashboard logs
2. Verify your credentials are correct
3. Ensure you have internet connection
4. Check Supabase status page: https://status.supabase.com/
