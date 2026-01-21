-- Database optimization queries for German Insurance Backend
-- Run these to improve performance of vector and text searches

-- ============================================
-- 1. CREATE INDEXES FOR VECTOR SEARCHES
-- ============================================

-- Index for vector similarity search using HNSW algorithm
-- This significantly speeds up similarity searches
CREATE INDEX IF NOT EXISTS idx_insurance_documents_embedding_hnsw 
ON insurance_documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (faster build, slightly slower search)
-- CREATE INDEX IF NOT EXISTS idx_insurance_documents_embedding_ivfflat 
-- ON insurance_documents 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- ============================================
-- 2. CREATE INDEXES FOR TEXT SEARCHES
-- ============================================

-- Full-text search index for content
CREATE INDEX IF NOT EXISTS idx_insurance_documents_content_fts 
ON insurance_documents 
USING gin(to_tsvector('german', content));

-- Index for insurer_id lookups
CREATE INDEX IF NOT EXISTS idx_insurance_documents_insurer_id 
ON insurance_documents(insurer_id);

-- Index for insurance_type filtering
CREATE INDEX IF NOT EXISTS idx_insurance_documents_insurance_type 
ON insurance_documents(insurance_type);

-- Composite index for filtered searches
CREATE INDEX IF NOT EXISTS idx_insurance_documents_type_insurer 
ON insurance_documents(insurance_type, insurer_id);

-- ============================================
-- 3. CREATE INDEXES FOR METADATA
-- ============================================

-- Index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_insurance_documents_created_at 
ON insurance_documents(created_at DESC);

-- Index for metadata JSONB searches
CREATE INDEX IF NOT EXISTS idx_insurance_documents_metadata 
ON insurance_documents 
USING gin(metadata);

-- ============================================
-- 4. OPTIMIZE INSURERS TABLE
-- ============================================

-- Index for insurer name searches
CREATE INDEX IF NOT EXISTS idx_insurers_name 
ON insurers(name);

-- Index for insurer type
CREATE INDEX IF NOT EXISTS idx_insurers_type 
ON insurers(type);

-- ============================================
-- 5. UPDATE TABLE STATISTICS
-- ============================================

-- Analyze tables to update statistics for query planner
ANALYZE insurance_documents;
ANALYZE insurers;

-- ============================================
-- 6. VERIFY INDEXES
-- ============================================

-- View all indexes on insurance_documents table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'insurance_documents'
ORDER BY indexname;

-- View index sizes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('insurance_documents', 'insurers')
ORDER BY pg_relation_size(indexrelid) DESC;
