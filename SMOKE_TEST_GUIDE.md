# Smoke Test Setup & Execution Guide

## 🎯 Current Status

**Smoke test script created and executed** but database schema is not applied yet.

## ✅ What's Complete

### 1. Test Queries Created (10 queries)

#### Easy Difficulty (6 queries):
1. **Direct Insurer Mention:** "Allianz Krankenversicherung"
2. **Direct Product Mention:** "HUK Autoversicherung"  
3. **Direct Product Mention:** "ERGO Hausratversicherung"
4. **General Question:** "Was ist eine Krankenversicherung?"
5. **General Question:** "Wie funktioniert Autoversicherung?"
6. **Product Benefits:** "Hausrat Versicherung Leistungen"

#### Medium Difficulty (4 queries):
7. **Coverage Question:** "Welche Kosten deckt die Krankenversicherung ab?"
8. **Comparison:** "Vollkasko oder Teilkasko Auto?"
9. **Specific Scenario:** "Hausratversicherung bei Einbruch"
10. **Policy Comparison:** "Unterschied gesetzliche und private Krankenversicherung"

### 2. Smoke Test Script Features

- ✅ Runs all 10 test queries through `searchSimilarChunks`
- ✅ Evaluates if correct insurers are retrieved
- ✅ Logs results for each query (pass/fail)
- ✅ Calculates pass rate percentage
- ✅ Documents all issues found
- ✅ Generates shareable markdown report
- ✅ Shows performance metrics (query time)
- ✅ Color-coded console output

### 3. Test Evaluation Logic

Each query is evaluated on:
- **Expected Insurers:** Which insurer(s) should appear in results
- **Retrieved Insurers:** Which insurer(s) actually appeared
- **Similarity Scores:** How relevant the results are (0-1)
- **Execution Time:** How long the query took (target <500ms)
- **Pass/Fail:** Did we find the expected insurer?

## 📋 Prerequisites (Must Complete First)

### Step 1: Apply Database Schema

The test requires these tables:
- `insurers` - Insurance companies
- `documents` - Insurance policy documents
- `document_chunks` - Text chunks with embeddings

**Action Required:**

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/vtmsosynpediclfycnni/sql/new
   ```

2. Copy and paste the complete SQL from [db/schema.sql](db/schema.sql)

3. Click **RUN** to create tables and indexes

4. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('insurers', 'documents', 'document_chunks');
   ```

### Step 2: Load Sample Data (Optional for Initial Test)

For a quick test without full data pipeline:

```sql
-- Insert sample insurers
INSERT INTO insurers (name, insurance_types) VALUES
  ('Allianz', ARRAY['health', 'life']),
  ('HUK', ARRAY['auto', 'liability']),
  ('ERGO', ARRAY['household', 'liability'])
ON CONFLICT (name) DO NOTHING;

-- Insert sample document (need insurer_id from above)
-- Then insert document_chunks with embeddings
-- See: db/migrations/002_sample_data.sql for full script
```

### Step 3: Run Full Data Pipeline (Recommended)

For complete testing with real documents:

```bash
# Clean raw documents
node scripts/data-processing/01-clean-documents.js

# Split into chunks
node scripts/data-processing/02-chunk-documents.js

# Generate embeddings (requires Vertex AI or uses fallback)
node scripts/data-processing/03-generate-embeddings.js

# Upload to Supabase
node scripts/data-processing/04-upload-to-supabase.js
```

## 🚀 Running the Smoke Test

Once prerequisites are complete:

```bash
node smoke-test-queries.js
```

### Expected Output

```
================================================================================
  RAG SEARCH SMOKE TEST
  Testing 10 queries with vector similarity search
================================================================================

📊 Checking database status...
✅ Found 3 insurers in database
✅ Database has document chunks: Yes

────────────────────────────────────────────────────────────────────────────────
Test 1/10 [EASY]
Query: "Allianz Krankenversicherung"
Expected: Allianz
✅ PASS - Found expected insurer(s)
   Retrieved: Allianz
   Time: 245ms
   Top result similarity: 0.892

[... 9 more tests ...]

================================================================================
  TEST SUMMARY
================================================================================

Total Tests: 10
Passed: 8
Failed: 2
Pass Rate: 80.0%

Average Query Time: 287ms
Slowest Query: 456ms

📝 Generating report...
✅ Report saved: smoke-test-results-2025-12-14.md

================================================================================
  ✅ SMOKE TEST PASSED - Ready for full evaluation
================================================================================
```

## 📊 Test Results Report

The test automatically generates a markdown report:

**File:** `smoke-test-results-YYYY-MM-DD.md`

**Contents:**
- Executive summary (pass rate, avg time)
- Database status
- Detailed results for each query
- Issues identified
- Recommendations
- Performance analysis
- Completion checklist
- Next steps

## 🎯 Success Criteria

### Pass Rate Targets

- **✅ 80%+ Pass Rate:** Good - Ready for full evaluation
- **⚠️ 60-79% Pass Rate:** Needs improvement - Tune parameters
- **❌ <60% Pass Rate:** Critical issues - Fix before continuing

### Performance Targets

- **Average Query Time:** <500ms
- **Individual Query:** <1000ms
- **Slowest Query:** Should be logged for optimization

## 🐛 Common Issues & Solutions

### Issue 1: "Table 'document_chunks' not found"

**Solution:** Apply database schema (see Step 1 above)

### Issue 2: "No insurers found in database"

**Solution:** Load insurer data
```sql
INSERT INTO insurers (name, insurance_types) VALUES
  ('Allianz', ARRAY['health']),
  ('HUK', ARRAY['auto']),
  ('ERGO', ARRAY['household']);
```

### Issue 3: "No document chunks found"

**Solution:** Run data processing pipeline (see Step 3 above)

### Issue 4: All tests fail - wrong insurers retrieved

**Possible Causes:**
- Embeddings not matching queries (check embedding model)
- Chunks don't contain relevant text (review chunking strategy)
- Match threshold too high (lower it in smoke-test-queries.js)

**Solution:**
```javascript
// In smoke-test-queries.js, adjust matchThreshold
const searchResult = await searchSimilarChunks(testCase.query, {
  matchCount: 5,
  matchThreshold: 0.2, // Lower threshold = more results
  timeout: 10000
});
```

### Issue 5: Queries too slow (>500ms)

**Solutions:**
1. Check IVFFlat index exists:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'document_chunks';
   ```

2. Adjust index parameters:
   ```sql
   DROP INDEX IF EXISTS idx_chunks_embedding_ivfflat;
   CREATE INDEX idx_chunks_embedding_ivfflat 
   ON document_chunks 
   USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 300);  -- Increase for more data
   ```

3. Use HNSW index instead (faster but more memory):
   ```sql
   CREATE INDEX idx_chunks_embedding_hnsw 
   ON document_chunks 
   USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   ```

## 📤 Sharing Results

### With Surendra

1. **Send the generated report:**
   - File: `smoke-test-results-YYYY-MM-DD.md`
   - Method: Email, Slack, or commit to repo

2. **Include key metrics in message:**
   ```
   RAG Search Smoke Test Results
   
   Pass Rate: 80% (8/10 queries passed)
   Avg Query Time: 287ms
   Status: ✅ Ready for full evaluation
   
   See detailed report: smoke-test-results-2025-12-14.md
   ```

3. **Highlight any issues:**
   - List failed queries
   - Note performance problems
   - Suggest next steps

### In Documentation

Add results to project docs:

```markdown
## Testing Status

- ✅ Smoke Test: 80% pass rate (2025-12-14)
- ⏱️ Performance: 287ms avg query time
- 📊 Database: 3 insurers, XXX chunks
- 🎯 Next: Full evaluation with edge cases
```

## ✅ Completion Checklist

Mark as complete when:

- [x] All 10 smoke test queries are run
- [x] Results are logged in the template format
- [x] Pass rate is calculated
- [x] Issues are documented
- [ ] Results are shared with Surendra ← **ACTION NEEDED**
- [ ] Ready for full evaluation or tuning ← **After schema applied**

## 🚀 Next Steps

### Immediate (Required)

1. **Apply database schema in Supabase**
   - File: [db/schema.sql](db/schema.sql)
   - Location: Supabase SQL Editor
   - Time: ~2 minutes

2. **Load sample data or run pipeline**
   - Quick: Insert sample data via SQL
   - Complete: Run full data processing pipeline
   - Time: 5-30 minutes depending on method

3. **Re-run smoke test**
   ```bash
   node smoke-test-queries.js
   ```

4. **Share results with Surendra**
   - Send report file
   - Discuss any issues
   - Plan next steps

### After Passing (Optional)

5. **Full evaluation:** Test with edge cases and complex queries
6. **Performance tuning:** Optimize slow queries
7. **Production preparation:** Configure Vertex AI, monitoring
8. **Integration testing:** Test full RAG pipeline end-to-end

## 📁 Related Files

- **Smoke Test Script:** [smoke-test-queries.js](smoke-test-queries.js)
- **Test Results:** `smoke-test-results-YYYY-MM-DD.md` (auto-generated)
- **Search Function:** [src/services/rag.service.js](src/services/rag.service.js)
- **Database Schema:** [db/schema.sql](db/schema.sql)
- **Setup Guide:** [PGVECTOR_SETUP_GUIDE.md](PGVECTOR_SETUP_GUIDE.md)

## 🎓 Understanding the Tests

### Test Structure

Each test includes:
```javascript
{
  id: 1,
  difficulty: 'EASY',
  query: 'Allianz Krankenversicherung',
  expectedInsurers: ['Allianz'],
  description: 'Direct mention of insurer and product'
}
```

### Evaluation Logic

1. **Generate embedding** for query text
2. **Search** using vector similarity (cosine distance)
3. **Retrieve** top 5 similar chunks
4. **Extract** insurer IDs from chunks
5. **Check** if expected insurer is in results
6. **Pass/Fail** based on match

### Why Tests Might Fail

- **Legitimate Failures:** System not working correctly
- **Data Issues:** Missing or incorrect data in database
- **Threshold Too High:** Match threshold filtering out valid results
- **Embedding Mismatch:** Query embedding doesn't match document embeddings
- **Chunking Issues:** Text chunks don't contain relevant keywords

---

**Status:** Script ready, waiting for database schema  
**Next Action:** Apply schema in Supabase, then run test  
**Owner:** Suria & Surendra
