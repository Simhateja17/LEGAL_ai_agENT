-- Supabase pgvector Extension Verification Script
-- Run this in Supabase SQL Editor to verify pgvector is properly installed

-- Step 1: Check if pgvector extension exists
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Expected output: One row with extname = 'vector'
-- If empty, run: CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Verify vector type is available
SELECT '[1,2,3]'::vector AS test_vector;

-- Expected output: [1,2,3]

-- Step 3: Test vector operations (cosine distance)
SELECT 
  '[1,0,0]'::vector <=> '[1,0,0]' AS same_vector_distance,      -- Should be 0
  '[1,0,0]'::vector <=> '[0,1,0]' AS perpendicular_distance,    -- Should be 1
  '[1,0,0]'::vector <=> '[-1,0,0]' AS opposite_distance;        -- Should be 2

-- Step 4: Create test table with vector column (768 dimensions like Vertex AI embeddings)
CREATE TABLE IF NOT EXISTS pgvector_test (
  id SERIAL PRIMARY KEY,
  embedding VECTOR(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Insert test vector
INSERT INTO pgvector_test (embedding) 
VALUES (array_fill(0.5, ARRAY[768])::vector);

-- Step 6: Query with cosine distance
SELECT 
  id, 
  embedding <=> array_fill(0.5, ARRAY[768])::vector AS distance
FROM pgvector_test
ORDER BY distance
LIMIT 1;

-- Expected: distance = 0 (exact match)

-- Step 7: Clean up test table
DROP TABLE IF EXISTS pgvector_test;

-- ✅ If all queries above run successfully, pgvector is properly configured!
