# 🚀 COMPLETE RAG SETUP TEST GUIDE

This guide will walk you through testing the entire German Insurance RAG system from scratch.

## Prerequisites Checklist

- [x] ✅ Node.js installed
- [x] ✅ `.env` file configured with Supabase credentials
- [ ] ⏳ Database schema created in Supabase
- [ ] ⏳ Server tested and running
- [ ] ⏳ RAG pipeline tested

---

## STEP 1: Set Up Database Schema (5 minutes)

### Option A: Using Supabase SQL Editor (Recommended)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/kxplqylfijtyhcmcbpae/sql/new
   ```

2. **Copy the SQL from** `SETUP_SQL.sql` (file is already open in your editor)

3. **Paste into SQL Editor and click "Run"**

4. **Verify** you see:
   ```
   Tables Created: 3
   Insurers Loaded: 3
   pgvector Extension: Enabled
   ```

### Verify Database Setup

```powershell
node test-supabase-connection.js
```

**Expected Output:**
```
✅ Supabase client initialized
✅ Table 'public.insurers' found with 3 records
✅ Table 'public.documents' found
✅ Table 'public.document_chunks' found
✅ Function 'search_similar_chunks' found
```

---

## STEP 2: Test RAG Components (2 minutes)

Run the comprehensive test suite:

```powershell
node test-complete-rag-setup.js
```

**This tests:**
- ✅ Database connection
- ✅ Embedding service (768-dimensional vectors)
- ✅ LLM service (Gemini integration)
- ✅ RAG pipeline (query → embed → search → generate)

**Expected Output:**
```
✅ Passed: 15+
❌ Failed: 0 (or only API tests if server isn't running yet)
```

---

## STEP 3: Start the Server (1 minute)

```powershell
npm start
```

**Expected Output:**
```
🚀 German Insurance Backend Server
📍 Environment: development
🔗 Server running on port 3000
✅ Supabase connected
✅ RAG services ready
```

**Keep this terminal open!**

---

## STEP 4: Test API Endpoints (3 minutes)

### Test 1: Health Check
Open in browser or run:
```powershell
curl http://localhost:3000/api/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T...",
  "uptime": "2.5s",
  "services": {
    "database": "connected",
    "embedding": "ready",
    "llm": "ready"
  }
}
```

### Test 2: RAG Search Query
```powershell
curl "http://localhost:3000/api/query/search?q=Krankenversicherung"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "query": "Krankenversicherung",
    "answer": "Eine Krankenversicherung ist...",
    "sources": [...],
    "metadata": {
      "processingTime": "1234ms",
      "model": "gemini-1.5-flash"
    }
  }
}
```

### Test 3: View Statistics
```powershell
curl http://localhost:3000/api/stats
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "totalQueries": 1,
    "averageResponseTime": "1234ms"
  }
}
```

---

## STEP 5: Interactive Testing

### In Browser:
1. Open: `http://localhost:3000/api/health`
2. Test queries:
   - `http://localhost:3000/api/query/search?q=Krankenversicherung`
   - `http://localhost:3000/api/query/search?q=Hausratversicherung`
   - `http://localhost:3000/api/query/search?q=Autoversicherung Kosten`

### Using Postman or Thunder Client:
```
GET http://localhost:3000/api/query/search
Query Params:
  q: Krankenversicherung
  limit: 5
  threshold: 0.7
```

---

## Sample Test Queries

| Query | Expected Behavior |
|-------|-------------------|
| `Krankenversicherung Kosten` | Returns health insurance cost information |
| `Hausratversicherung Leistungen` | Returns home insurance benefits |
| `Autoversicherung Vergleich` | Returns auto insurance comparison |
| `Lebensversicherung Allianz` | Returns life insurance info from Allianz |
| `ERGO Versicherung Kontakt` | Returns ERGO contact information |

---

## Troubleshooting

### ❌ "Could not find table"
- **Solution:** Run `SETUP_SQL.sql` in Supabase SQL Editor

### ❌ "SUPABASE_URL not set"
- **Solution:** Check `.env` file has all required variables

### ❌ "Port 3000 already in use"
- **Solution:** Kill existing process or change PORT in `.env`
  ```powershell
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

### ❌ "Vertex AI not configured" (Warning only)
- **Solution:** This is OK! System runs in fallback mode with mock embeddings
- To use real Vertex AI, add these to `.env`:
  ```
  GOOGLE_PROJECT_ID=your-project-id
  GOOGLE_LOCATION=us-central1
  ```

---

## Complete Test Checklist

- [ ] Database schema created (3 tables, 1 function)
- [ ] `node test-supabase-connection.js` passes
- [ ] `node test-complete-rag-setup.js` passes
- [ ] Server starts without errors (`npm start`)
- [ ] `/api/health` returns healthy status
- [ ] `/api/query/search?q=Krankenversicherung` returns answer
- [ ] `/api/stats` shows query statistics

---

## Quick Commands Reference

```powershell
# 1. Setup database (one-time)
# Copy SETUP_SQL.sql → Supabase SQL Editor → Run

# 2. Verify database
node test-supabase-connection.js

# 3. Test RAG components
node test-complete-rag-setup.js

# 4. Start server
npm start

# 5. Test endpoint
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/query/search?q=Krankenversicherung"
```

---

## Architecture Overview

```
User Query
    ↓
Express API (/api/query/search)
    ↓
RAG Service (rag.service.js)
    ├→ Embedding Service → Generate query embedding (768-dim)
    ├→ Supabase/pgvector → Vector similarity search
    └→ LLM Service → Generate answer with context
    ↓
JSON Response with answer + sources
```

---

## Success Criteria

Your RAG system is fully working when:

1. ✅ All database tables exist and are accessible
2. ✅ Test suite passes (15+ tests)
3. ✅ Server starts and responds to health checks
4. ✅ RAG queries return relevant answers
5. ✅ Response times are < 3 seconds

---

## Next Steps After Testing

1. **Add Real Data:**
   - Upload your insurance documents
   - Generate embeddings: `npm run process:all`

2. **Configure Vertex AI (Optional):**
   - Add Google Cloud credentials
   - Remove `RAG_FALLBACK_MODE=true`

3. **Deploy:**
   - Follow `DEPLOYMENT_GUIDE.md`
   - Deploy to Vercel/Railway/Google Cloud

4. **Monitor:**
   - Check `/api/stats` regularly
   - Review logs in `logs/` directory

---

## Support

If you encounter issues:
1. Check `.env` configuration
2. Verify database schema in Supabase dashboard
3. Review server logs
4. Test each component individually

Happy testing! 🎉
