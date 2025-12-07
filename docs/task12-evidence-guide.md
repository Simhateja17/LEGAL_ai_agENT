# Task 12 Evidence Guide - Supabase Setup and Connection

**Task**: Task 12 (Day 12) - Complete Supabase Database Setup and Connection  
**Date**: 2024  
**Status**: ✅ Ready for Execution  

---

## Evidence Collection Instructions

This guide helps **Surendra** (Database Admin) and **Poojitha** (Backend Developer) document their setup process for verification and troubleshooting.

---

## Part 1: Surendra's Evidence (Database Setup)

### Evidence 1: Supabase Project Creation

**Screenshot Requirements:**
1. Supabase dashboard showing new project
2. Project name: `german-insurance-backend`
3. Project status: Active
4. Region selected

**File Name**: `01_supabase_project_created.png`

**What to Capture:**
- Full Supabase dashboard
- Project name clearly visible
- Green "Active" status indicator
- Project URL visible (can blur sensitive parts)

---

### Evidence 2: pgvector Extension Enabled

**SQL Query to Run:**
```sql
-- Verify pgvector extension
SELECT extname, extversion, installed 
FROM pg_extension 
WHERE extname = 'vector';
```

**Expected Output:**
```
extname | extversion | installed
--------|------------|----------
vector  | 0.5.0      | true
```

**Screenshot Requirements:**
1. SQL Editor with query
2. Query results showing pgvector installed
3. Timestamp visible

**File Name**: `02_pgvector_enabled.png`

**Alternative Text Output:**
Save SQL Editor output to: `02_pgvector_verification.txt`

---

### Evidence 3: Schema Migration Success

**SQL Query to Run:**
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

**Screenshot Requirements:**
1. SQL Editor showing migration script execution
2. Success message: "Success. No rows returned"
3. Table verification query results
4. All 3 tables visible

**File Names**:
- `03a_migration_execution.png`
- `03b_tables_verified.png`

---

### Evidence 4: Indexes Verification

**SQL Query to Run:**
```sql
-- Count indexes created
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('insurers', 'insurance_products', 'insurance_chunks')
GROUP BY tablename
ORDER BY tablename;
```

**Expected Output:**
```
tablename           | index_count
--------------------|------------
insurance_chunks    | 8+
insurance_products  | 6+
insurers            | 5+
```

**Screenshot Requirements:**
1. Query showing index counts per table
2. Results showing 20+ total indexes

**File Name**: `04_indexes_verified.png`

---

### Evidence 5: Functions Created

**SQL Query to Run:**
```sql
-- Verify functions created
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'search_insurance_chunks',
    'get_insurer_products',
    'get_product_chunks',
    'check_pgvector_extension'
  )
ORDER BY routine_name;
```

**Expected Output:**
- 4 functions listed
- All showing routine_type = 'FUNCTION'

**Screenshot Requirements:**
1. Query results showing all 4 functions
2. Function names clearly visible

**File Name**: `05_functions_verified.png`

---

### Evidence 6: Sample Data Loaded (Optional)

**SQL Query to Run:**
```sql
-- Verify sample data counts
SELECT 
  'insurers' AS table_name,
  COUNT(*) AS record_count
FROM insurers
UNION ALL
SELECT 
  'insurance_products' AS table_name,
  COUNT(*) AS record_count
FROM insurance_products
UNION ALL
SELECT 
  'insurance_chunks' AS table_name,
  COUNT(*) AS record_count
FROM insurance_chunks
ORDER BY table_name;
```

**Expected Output:**
```
table_name          | record_count
--------------------|-------------
insurance_chunks    | 27
insurance_products  | 9
insurers            | 3
```

**Screenshot Requirements:**
1. Query showing data counts
2. Results matching expected counts

**File Name**: `06_sample_data_loaded.png`

---

### Evidence 7: Database Health Check

**SQL Query to Run:**
```sql
-- Comprehensive health check
DO $$
DECLARE
  insurer_count INT;
  product_count INT;
  chunk_count INT;
  index_count INT;
  function_count INT;
BEGIN
  SELECT COUNT(*) INTO insurer_count FROM insurers;
  SELECT COUNT(*) INTO product_count FROM insurance_products;
  SELECT COUNT(*) INTO chunk_count FROM insurance_chunks;
  
  SELECT COUNT(*) INTO index_count 
  FROM pg_indexes 
  WHERE schemaname = 'public';
  
  SELECT COUNT(*) INTO function_count 
  FROM pg_proc 
  WHERE pronamespace = 'public'::regnamespace;
  
  RAISE NOTICE '=== Database Health Check ===';
  RAISE NOTICE 'Insurers: %', insurer_count;
  RAISE NOTICE 'Products: %', product_count;
  RAISE NOTICE 'Chunks: %', chunk_count;
  RAISE NOTICE 'Indexes: %', index_count;
  RAISE NOTICE 'Functions: %', function_count;
  
  IF insurer_count >= 0 AND product_count >= 0 AND index_count >= 20 THEN
    RAISE NOTICE 'Status: ✅ HEALTHY';
  ELSE
    RAISE NOTICE 'Status: ⚠️  NEEDS ATTENTION';
  END IF;
END $$;
```

**Expected Output:**
```
=== Database Health Check ===
Insurers: 3 (or 0 if sample data not loaded)
Products: 9 (or 0 if sample data not loaded)
Chunks: 27 (or 0 if sample data not loaded)
Indexes: 20+
Functions: 4+
Status: ✅ HEALTHY
```

**Screenshot Requirements:**
1. SQL Editor showing health check output
2. All metrics visible
3. Status: HEALTHY

**File Name**: `07_database_health_check.png`

---

### Evidence 8: Credentials Shared with Poojitha

**Checklist Documentation:**

Create a text file with:

```
# Credentials Sharing Checklist

Date: [DATE]
From: Surendra (Database Admin)
To: Poojitha (Backend Developer)

✅ SUPABASE_URL prepared
✅ SUPABASE_KEY prepared (service_role key)
✅ Sharing method: [e.g., "Encrypted email", "Signal message"]
✅ Credentials sent on: [DATE and TIME]
✅ Poojitha confirmed receipt: [DATE and TIME]
✅ Credentials verified working: [Yes/No]

Notes:
- Method used: [description]
- Security measures: [e.g., "Sent in separate messages, deleted after confirmation"]
- Additional info shared: [e.g., "Database password for direct access"]
```

**File Name**: `08_credentials_shared_checklist.txt`

---

## Part 2: Poojitha's Evidence (Backend Integration)

### Evidence 9: .env File Created

**File Content to Document:**

```bash
# List files to verify .env exists
ls -la | grep .env

# Expected output:
# -rw-r--r-- 1 user user  1234 Dec 7 10:00 .env
# -rw-r--r-- 1 user user  5678 Dec 7 09:00 .env.example
```

**Verification:**
```bash
# Verify .env is in .gitignore
cat .gitignore | grep "^\.env$"

# Expected output:
# .env
```

**Screenshot Requirements:**
1. Terminal showing .env file exists
2. .gitignore verification showing .env excluded

**File Name**: `09_env_file_created.png`

---

### Evidence 10: Connection Test Successful

**Command to Run:**
```bash
node test-connection.js
```

**Expected Output:**
```
🔍 Testing Supabase Connection...
============================================================
✅ Environment variables found:
   SUPABASE_URL: https://xxx...
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

**Screenshot Requirements:**
1. Full terminal output of test-connection.js
2. All green checkmarks visible
3. "CONNECTION TEST COMPLETE" message
4. Summary showing all systems ready

**File Name**: `10_connection_test_success.png`

**Alternative**: Save full output to text file:
```bash
node test-connection.js > connection-test-output.txt 2>&1
```

**File Name**: `10_connection_test_output.txt`

---

### Evidence 11: Backend Server Started

**Command to Run:**
```bash
npm run dev
```

**Expected Output:**
```
✓ Supabase client initialized
  URL: https://xxx...
Server running on http://localhost:3000
```

**Screenshot Requirements:**
1. Terminal showing server startup
2. No error messages
3. Supabase client initialized message
4. Server running message

**File Name**: `11_backend_server_started.png`

---

### Evidence 12: API Health Check

**Commands to Run:**
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Expected output:
# {"status":"ok","timestamp":"2024-...","service":"german-insurance-backend"}

# Test insurers endpoint
curl http://localhost:3000/api/insurers

# Expected output:
# [{"id":"...","name":"Allianz",...}, {"id":"...","name":"AXA",...}, ...]
```

**Screenshot Requirements:**
1. Terminal showing both curl commands
2. JSON responses visible
3. No error messages
4. Data returned successfully

**File Name**: `12_api_endpoints_tested.png`

---

### Evidence 13: Supabase Client Configuration

**File Content:**

```bash
# Show Supabase client configuration
cat src/db/supabase.js
```

**Expected Content:**
```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL...');
}

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_KEY...');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
});

// Log connection status
if (process.env.NODE_ENV === 'development') {
  console.log('✓ Supabase client initialized');
  console.log(`  URL: ${supabaseUrl.substring(0, 30)}...`);
}

export default supabase;
```

**Screenshot Requirements:**
1. VS Code or text editor showing supabase.js
2. Full file content visible
3. Configuration options highlighted

**File Name**: `13_supabase_client_config.png`

---

## Part 3: Combined Evidence (Team Verification)

### Evidence 14: End-to-End Test

**Test Scenario:**
1. Surendra confirms database is ready
2. Poojitha confirms backend is connected
3. Test query from backend to database

**SQL Query (Surendra runs in Supabase):**
```sql
-- Confirm database is ready for backend
SELECT 
  'Database Status' AS check_type,
  'Ready' AS status,
  NOW() AS timestamp
UNION ALL
SELECT 
  'Tables',
  CAST(COUNT(*) AS TEXT),
  NOW()
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('insurers', 'insurance_products', 'insurance_chunks')
UNION ALL
SELECT 
  'pgvector',
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN 'Installed' ELSE 'Missing' END,
  NOW();
```

**Backend Query (Poojitha tests via API):**
```bash
# Query insurers via API
curl http://localhost:3000/api/insurers | jq

# Expected: JSON array with insurer data
```

**Screenshot Requirements:**
1. Database query results from Surendra
2. API query results from Poojitha
3. Both showing successful data flow
4. Timestamps matching recent execution

**File Names**:
- `14a_database_ready_confirmation.png` (Surendra)
- `14b_api_data_retrieved.png` (Poojitha)

---

### Evidence 15: Performance Baseline

**Query Performance Test (Surendra):**
```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT *
FROM insurers
WHERE name ILIKE '%allianz%';

-- Test vector index performance
EXPLAIN ANALYZE
SELECT *
FROM insurance_chunks
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector(768)
LIMIT 5;
```

Note: Replace `[0.1, 0.2, ...]` with actual 768-dimensional vector for real test.

**Screenshot Requirements:**
1. EXPLAIN ANALYZE output
2. Execution time visible
3. Index usage confirmed

**File Name**: `15_performance_baseline.png`

---

## Evidence Submission Checklist

### Surendra's Deliverables

```
✅ 01_supabase_project_created.png
✅ 02_pgvector_enabled.png
✅ 03a_migration_execution.png
✅ 03b_tables_verified.png
✅ 04_indexes_verified.png
✅ 05_functions_verified.png
✅ 06_sample_data_loaded.png (optional)
✅ 07_database_health_check.png
✅ 08_credentials_shared_checklist.txt
✅ 14a_database_ready_confirmation.png
✅ 15_performance_baseline.png
```

### Poojitha's Deliverables

```
✅ 09_env_file_created.png
✅ 10_connection_test_success.png (or .txt)
✅ 11_backend_server_started.png
✅ 12_api_endpoints_tested.png
✅ 13_supabase_client_config.png
✅ 14b_api_data_retrieved.png
```

---

## Evidence Storage

### Recommended Folder Structure

```
docs/
  day12-evidence/
    surendra/
      01_supabase_project_created.png
      02_pgvector_enabled.png
      03a_migration_execution.png
      03b_tables_verified.png
      04_indexes_verified.png
      05_functions_verified.png
      06_sample_data_loaded.png
      07_database_health_check.png
      08_credentials_shared_checklist.txt
      14a_database_ready_confirmation.png
      15_performance_baseline.png
    
    poojitha/
      09_env_file_created.png
      10_connection_test_success.png
      11_backend_server_started.png
      12_api_endpoints_tested.png
      13_supabase_client_config.png
      14b_api_data_retrieved.png
    
    README.md (this file)
```

### Create Evidence Folder

```bash
# Create evidence folder structure
mkdir -p docs/day12-evidence/surendra
mkdir -p docs/day12-evidence/poojitha

# Copy this guide to evidence folder
cp docs/task12-evidence-guide.md docs/day12-evidence/README.md
```

---

## Troubleshooting Evidence

### If Something Fails

**Document the Failure:**
1. Screenshot of error message
2. Full error logs (copy from terminal)
3. Steps taken before error occurred
4. Environment details (OS, Node version, etc.)

**File Naming:**
- `error_[step-number]_[description].png`
- Example: `error_03_migration_failed.png`

**Error Log Template:**
```
# Error Report

Date: [DATE]
Time: [TIME]
Step: [Step number and name]
User: [Surendra/Poojitha]

## Error Message
[Paste full error message here]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Error occurred]

## Environment
- OS: [e.g., Windows 11, macOS 14]
- Node.js: [version]
- PostgreSQL: [version]
- Supabase: [region, project details]

## Resolution Attempted
[What you tried to fix it]

## Resolution Status
[Fixed/Still blocked/Needs help]
```

---

## Verification Meeting

### Evidence Review Checklist

Schedule a quick meeting (15 minutes) to review:

```
✅ Surendra shows database setup complete
✅ Poojitha shows backend connected
✅ Both confirm end-to-end test passed
✅ Performance baseline documented
✅ Evidence uploaded to shared folder
✅ Any issues discussed and resolved
✅ Ready to proceed to Task 13
```

---

## Next Steps After Evidence Collection

1. ✅ Review all evidence for completeness
2. ✅ Store evidence in Git repository (in `docs/day12-evidence/`)
3. ✅ Commit evidence files with message: "Add Task 12 evidence - Supabase setup complete"
4. ✅ Update project status to "Task 12 Complete"
5. 🔄 Begin Task 13: Data Ingestion Pipeline

---

**Task 12 Evidence Collection**: Complete when all checkmarks are green!

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: ✅ Ready for Use
