# Supabase + pgvector Setup Guide

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

## 4. Find Your API Keys

You need two keys from Supabase:

1. In your Supabase project dashboard, navigate to **Settings** (gear icon in left sidebar)
2. Click **API** in the Settings menu
3. You'll see two important values:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```
- This is your `SUPABASE_URL`
- Copy this value

### API Keys

You'll see multiple keys. For the backend, you need:

**Service Role Key (secret)** ⚠️
- This key has admin privileges
- Never expose it in client-side code
- Use this for your backend server
- Copy the `service_role` key (it starts with `eyJ...`)

**Anon Key (public)**
- This is for client-side applications
- Not needed for this backend project

### ⚠️ Security Warning
- Keep your `service_role` key SECRET
- Never commit it to Git
- Never share it publicly
- Store it only in environment variables

## 5. Store Keys in .env File

1. Open your `.env` file in the project root
2. Update it with your actual Supabase credentials:

```env
PORT=3000
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace:
- `https://xxxxxxxxxxxxx.supabase.co` with your actual Project URL
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with your actual service_role key

3. Save the file
4. **Verify** the `.env` file is in your `.gitignore` to prevent accidental commits

## 6. Run schema.sql in SQL Editor

Now set up your database tables:

1. Open the file `db/schema.sql` in your project
2. Copy the entire contents of the file
3. In Supabase, go to **SQL Editor**
4. Click **"New query"**
5. Paste the entire schema SQL
6. Click **"Run"** or press `Ctrl+Enter`

This will create:
- ✅ pgvector extension (if not already enabled)
- ✅ `insurers` table
- ✅ `documents` table  
- ✅ `document_chunks` table with VECTOR(768) column
- ✅ All indexes (including IVFFlat for vector search)
- ✅ Helper functions for similarity search
- ✅ Automatic timestamp triggers

### Verify Tables Were Created

1. In the left sidebar, click **Table Editor**
2. You should see three new tables:
   - `insurers`
   - `documents`
   - `document_chunks`

### Test the Schema

Run this query to verify everything works:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify vector column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_chunks' 
  AND column_name = 'embedding';
```

## 7. Next Steps

Your Supabase database is now ready! You can:

1. **Test the connection**: Run your Node.js backend with `npm start`
2. **Add test data**: Insert sample insurers and documents
3. **Implement vector search**: Update `rag.service.js` to query document_chunks
4. **Monitor usage**: Check the Supabase dashboard for database statistics

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
