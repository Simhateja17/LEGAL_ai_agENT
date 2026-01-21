# 🎯 QUICK START: Run Smoke Test

## Current Status
✅ Smoke test script created with 10 queries  
❌ Database schema not applied yet  
❌ Cannot run tests until schema is ready

---

## 🚀 3-Step Quick Start

### Step 1: Apply Database Schema (2 minutes)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/vtmsosynpediclfycnni/sql/new
   ```

2. **Copy & Run SQL from:**
   - File: `db/schema.sql` OR
   - File: `PGVECTOR_SETUP_GUIDE.md` (Step 1, Section 2)

3. **Verify tables created:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   Should see: `insurers`, `documents`, `document_chunks`

### Step 2: Load Data (Choose One)

**Option A: Quick Test (5 min) - Sample Data**
```sql
-- In Supabase SQL Editor
INSERT INTO insurers (name, insurance_types) VALUES
  ('Allianz', ARRAY['health', 'life']),
  ('HUK', ARRAY['auto', 'liability']),
  ('ERGO', ARRAY['household', 'liability']);
```

**Option B: Full Test (30 min) - Real Documents**
```bash
node scripts/data-processing/01-clean-documents.js
node scripts/data-processing/02-chunk-documents.js
node scripts/data-processing/03-generate-embeddings.js
node scripts/data-processing/04-upload-to-supabase.js
```

### Step 3: Run Smoke Test

```bash
node smoke-test-queries.js
```

**Expected output:**
- ✅ 10 queries executed
- ✅ Pass/fail for each query
- ✅ Pass rate percentage
- ✅ Report file generated

---

## 📊 What the Test Does

### 10 Test Queries

1. ✅ Allianz Krankenversicherung (EASY)
2. ✅ HUK Autoversicherung (EASY)
3. ✅ ERGO Hausratversicherung (EASY)
4. ✅ Was ist eine Krankenversicherung? (EASY)
5. ✅ Wie funktioniert Autoversicherung? (EASY)
6. ✅ Hausrat Versicherung Leistungen (MEDIUM)
7. ✅ Welche Kosten deckt die Krankenversicherung ab? (MEDIUM)
8. ✅ Vollkasko oder Teilkasko Auto? (MEDIUM)
9. ✅ Hausratversicherung bei Einbruch (MEDIUM)
10. ✅ Unterschied gesetzliche und private Krankenversicherung (MEDIUM)

### For Each Query:
- Generates embedding
- Searches for similar chunks
- Checks if correct insurer appears
- Logs pass/fail
- Measures performance

---

## 📋 Success Criteria

| Status | Pass Rate | Meaning |
|--------|-----------|---------|
| ✅ GOOD | 80%+ | Ready for full evaluation |
| ⚠️ NEEDS WORK | 60-79% | Tune parameters |
| ❌ CRITICAL | <60% | Fix issues first |

**Performance Target:** <500ms per query

---

## 📤 After Running

1. **Check generated report:**
   - File: `smoke-test-results-2025-12-14.md`
   - Contains detailed results for all queries

2. **Share with Surendra:**
   - Send report file
   - Include pass rate and key issues
   - Discuss next steps

3. **Mark complete when:**
   - [ ] All 10 queries run
   - [ ] Results logged
   - [ ] Pass rate calculated
   - [ ] Issues documented
   - [ ] Shared with Surendra
   - [ ] Ready for full evaluation

---

## 🐛 Troubleshooting

### "Table document_chunks not found"
→ Apply schema (Step 1)

### "No insurers found"
→ Load data (Step 2)

### "All tests fail"
→ Lower match threshold in `smoke-test-queries.js`:
```javascript
matchThreshold: 0.2  // Lower = more results
```

### "Queries too slow"
→ Check vector index exists:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'document_chunks';
```

---

## 📁 Files

- **Test Script:** `smoke-test-queries.js`
- **Test Results:** `smoke-test-results-YYYY-MM-DD.md` (auto-generated)
- **Setup Guide:** `SMOKE_TEST_GUIDE.md` (detailed instructions)
- **Schema SQL:** `db/schema.sql`
- **Search Function:** `src/services/rag.service.js`

---

## ⚡ TL;DR

```bash
# 1. Apply schema in Supabase (db/schema.sql)
# 2. Load some data (insurers + chunks)
# 3. Run test
node smoke-test-queries.js

# 4. Check results
cat smoke-test-results-2025-12-14.md

# 5. Share with Surendra
```

**Current blocker:** Database schema not applied  
**Next action:** Run SQL in Supabase  
**Time needed:** ~5-10 minutes total
