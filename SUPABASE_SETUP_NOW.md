# 🚀 CRITICAL: Run This in Supabase NOW

## Step 1: Open Supabase SQL Editor
**URL:** https://supabase.com/dashboard/project/kxplqylfijtyhcmcbpae/sql/new

## Step 2: Copy and Paste This SQL (Click RUN)

```sql
-- =================================================================
-- FAST TEXT SEARCH FOR GERMAN LAWS (Works immediately!)
-- =================================================================

-- Create text search index for better performance
CREATE INDEX IF NOT EXISTS idx_german_laws_content_search 
ON german_laws_v2 USING gin(to_tsvector('german', content));

-- Create the text search function
CREATE OR REPLACE FUNCTION search_german_laws_text(
  search_query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  relevance float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gl.id,
    gl.content,
    gl.metadata,
    ts_rank(to_tsvector('german', gl.content), plainto_tsquery('german', search_query))::float AS relevance
  FROM german_laws_v2 gl
  WHERE to_tsvector('german', gl.content) @@ plainto_tsquery('german', search_query)
  ORDER BY relevance DESC
  LIMIT result_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_german_laws_text TO anon, authenticated, service_role;

-- Test it
SELECT * FROM search_german_laws_text('Kaufvertrag', 3);
```

## Step 3: After Running, Your System Will Work!

✅ The system will search your **458,500+ German law records**  
✅ Questions like "Was ist ein Kaufvertrag?" will work  
✅ No embedding dimension mismatch errors  

---

## Why This Works:
- Uses PostgreSQL's full-text search (no embeddings needed)
- Creates index for fast queries
- Works with your existing data immediately
