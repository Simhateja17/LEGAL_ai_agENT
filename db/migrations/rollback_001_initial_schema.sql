-- Rollback Script: Remove Initial Schema
-- Project: German Insurance AI Backend
-- Date: December 7, 2025
-- Description: Safely removes all tables, indexes, and functions
-- Use this if you need to start over or undo the migration

-- =============================================================================
-- WARNING: This will DELETE ALL DATA in these tables!
-- =============================================================================

-- Confirm you want to proceed:
-- DO $$ BEGIN
--   RAISE NOTICE 'Starting rollback of initial schema...';
-- END $$;

-- =============================================================================
-- STEP 1: Drop Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS update_insurers_updated_at ON insurers;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;

-- =============================================================================
-- STEP 2: Drop Functions
-- =============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS search_similar_chunks(VECTOR, INTEGER, FLOAT) CASCADE;
DROP FUNCTION IF EXISTS search_similar_chunks_by_insurer(VECTOR, UUID, INTEGER, FLOAT) CASCADE;
DROP FUNCTION IF EXISTS get_document_context(UUID, INTEGER) CASCADE;

-- =============================================================================
-- STEP 3: Drop Tables (in reverse dependency order)
-- =============================================================================

-- Drop document_chunks first (depends on documents and insurers)
DROP TABLE IF EXISTS document_chunks CASCADE;

-- Drop documents next (depends on insurers)
DROP TABLE IF EXISTS documents CASCADE;

-- Drop insurers last (no dependencies)
DROP TABLE IF EXISTS insurers CASCADE;

-- =============================================================================
-- STEP 4: Verification
-- =============================================================================

-- Verify tables were dropped
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('insurers', 'documents', 'document_chunks');
-- Should return 0 rows

-- Verify functions were dropped
SELECT proname FROM pg_proc 
WHERE proname IN ('search_similar_chunks', 'search_similar_chunks_by_insurer', 'get_document_context', 'update_updated_at_column');
-- Should return 0 rows

-- =============================================================================
-- NOTE: pgvector extension is NOT dropped
-- =============================================================================
-- The pgvector extension is left installed as it may be used by other schemas
-- If you want to remove it completely, uncomment:
-- DROP EXTENSION IF EXISTS vector CASCADE;

-- =============================================================================
-- Rollback Complete!
-- =============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Rollback complete. All tables, functions, and triggers removed.';
END $$;
