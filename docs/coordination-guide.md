# Coordination Guide: Poojitha ↔ Surendra

**Project**: German Insurance AI Backend
**Date**: December 7, 2025
**Purpose**: Align on repository setup, responsibilities, and handoff procedures

---

## 🎯 Project Overview

Building a RAG-powered AI backend for German insurance queries using:
- **Backend**: Node.js + Express.js (Poojitha)
- **Database**: Supabase + pgvector (Surendra)
- **AI**: Google Vertex AI (Embeddings + LLM)

---

## 📋 Current Status

### ✅ Completed by Poojitha

**Backend Architecture**:
- Express server with route → controller → service pattern
- Middleware: error handling, validation, request logging
- RAG service structure (mock implementations)
- Comprehensive documentation (4 days completed)

**Database Design**:
- Complete schema: 3 tables (insurers, documents, document_chunks)
- 20 indexes for performance optimization
- pgvector configuration (VECTOR(768) with IVFFlat)
- Migration scripts ready for deployment

**Documentation**:
- Architecture guide (day1-architecture.md)
- Schema design (day2-schema-design.md)
- Express patterns (day3-patterns.md)
- RAG diagrams (day4-rag-diagrams.md)
- Schema finalization (day9-schema-finalization.md)

### 🔄 Pending: Surendra's Tasks

1. **Clone Repository**
   - Get access to GitHub repository
   - Clone to local machine
   - Verify all files present

2. **Deploy Database Schema**
   - Execute migration script in Supabase
   - Verify pgvector extension
   - Load sample data for testing

3. **Environment Configuration**
   - Set up Supabase project
   - Share connection credentials with Poojitha
   - Configure RLS policies (if needed)

---

## 🔐 Repository Access

### Current Setup
- **Repository**: `german_insurance_backend`
- **Location**: Local on Poojitha's machine
- **Status**: Not yet on GitHub

### Next Steps for Coordination

**Option 1: GitHub Repository (Recommended)**
1. Poojitha creates GitHub repository
2. Poojitha adds Surendra as collaborator
3. Surendra clones repository
4. Both work on same codebase

**Option 2: File Sharing**
1. Poojitha exports project as ZIP
2. Shares via cloud storage (Google Drive, Dropbox)
3. Surendra imports and sets up Git locally
4. Eventually move to shared GitHub repo

**Option 3: Direct Handoff**
1. Poojitha shares screen/project during meeting
2. Surendra clones or downloads
3. Both verify structure matches

---

## 📁 Folder Structure Agreement

### Current Structure (Verified ✅)

```
german_insurance_backend/
├── src/                           # Backend code (Poojitha)
│   ├── index.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── db/
│   └── utils/
├── db/                            # Database files (Surendra focus)
│   ├── schema.sql
│   ├── verify-pgvector.sql
│   └── migrations/
│       ├── 001_initial_schema.sql   ← Surendra executes this
│       ├── rollback_001_initial_schema.sql
│       └── 002_sample_data.sql
├── scripts/                       # Data processing (Future)
│   └── data-processing/
│       └── README.md
├── docs/                          # Shared documentation
│   ├── day1-architecture.md
│   ├── day2-schema-design.md
│   ├── day9-schema-finalization.md
│   └── ...
├── test-connection.js             # Surendra runs after DB setup
├── test-query.js                  # Poojitha tests API
├── .env.example                   # Template for both
├── package.json
└── README.md
```

### Agreed Responsibilities

| Area | Owner | Tasks |
|------|-------|-------|
| **src/** | Poojitha | Backend code, API endpoints, business logic |
| **db/** | Surendra | Database deployment, migrations, pgvector setup |
| **scripts/** | Both | Data ingestion (coordinate on format) |
| **docs/** | Both | Maintain and update documentation |
| **.env** | Both | Each maintains their own copy (not in Git) |

---

## 🚀 Deployment Workflow

### Phase 1: Initial Setup (This Week)

**Surendra's Checklist**:
1. [ ] Clone/receive repository
2. [ ] Review folder structure
3. [ ] Read documentation:
   - `docs/day2-schema-design.md` - Understand schema
   - `docs/day9-schema-finalization.md` - Deployment guide
4. [ ] Set up Supabase project
5. [ ] Execute `db/migrations/001_initial_schema.sql`
6. [ ] Run verification queries (bottom of migration file)
7. [ ] Share Supabase credentials with Poojitha
   - SUPABASE_URL
   - SUPABASE_KEY (service role or anon key)

**Poojitha's Checklist**:
1. [ ] Share repository with Surendra
2. [ ] Wait for Supabase credentials
3. [ ] Update `.env` with credentials
4. [ ] Test connection: `node test-connection.js`
5. [ ] Verify backend can query database

### Phase 2: Sample Data (After Phase 1)

**Surendra**:
1. [ ] Execute `db/migrations/002_sample_data.sql`
2. [ ] Verify 3 insurers, 4 documents, 8 chunks inserted
3. [ ] Confirm Poojitha can query sample data

**Poojitha**:
1. [ ] Test API endpoints with sample data
2. [ ] Verify query responses
3. [ ] Report any issues to Surendra

### Phase 3: Vector Search Setup (After Phase 2)

**Surendra**:
1. [ ] Verify pgvector extension enabled
2. [ ] Check IVFFlat index created
3. [ ] Test search function with dummy vector

**Poojitha**:
1. [ ] Implement embedding generation (Vertex AI)
2. [ ] Test vector similarity search
3. [ ] Update chunks with real embeddings

---

## 🔄 Communication Protocol

### Daily Sync Points

**Morning Standup** (15 minutes):
- What did you complete yesterday?
- What are you working on today?
- Any blockers or questions?

**Evening Check-in** (5 minutes):
- Status update
- Share any issues encountered
- Plan for next day

### Communication Channels

**Recommended Setup**:
- **Slack/Discord**: Quick questions and updates
- **GitHub Issues**: Track bugs and feature requests
- **Shared Doc**: Meeting notes and decisions
- **Video Call**: Daily standup or when stuck

### Escalation Path

1. **Blocker identified** → Message immediately
2. **Not resolved in 30 min** → Schedule quick call
3. **Still blocked** → Document issue and move to next task
4. **Review together** → Daily standup or dedicated session

---

## 📊 Handoff Checklist

### From Poojitha to Surendra

**Code & Files**:
- [ ] Repository shared (GitHub/ZIP/other)
- [ ] All files present and readable
- [ ] Documentation complete and accessible
- [ ] Migration scripts tested locally (if possible)

**Documentation**:
- [ ] Schema design reviewed (day2-schema-design.md)
- [ ] Migration guide reviewed (day9-schema-finalization.md)
- [ ] Supabase setup reviewed (supabase-setup.md)
- [ ] Questions answered

**Credentials Needed by Surendra**:
- [ ] GitHub repository access (if using GitHub)
- [ ] Vertex AI project details (for future reference)

### From Surendra to Poojitha

**Database Setup**:
- [ ] Supabase project created
- [ ] Migration executed successfully
- [ ] Verification queries passed
- [ ] Sample data loaded (optional)

**Credentials to Share**:
- [ ] SUPABASE_URL
- [ ] SUPABASE_KEY (anon or service role)
- [ ] Database password (if direct connection needed)

**Access**:
- [ ] Poojitha added to Supabase project (viewer/editor)
- [ ] API endpoints accessible
- [ ] pgvector verified working

---

## 🧪 Testing Procedure

### After Database Deployment

**Surendra runs**:
```sql
-- In Supabase SQL Editor
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- Should return: vector | 0.5.1 (or higher)

SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('insurers', 'documents', 'document_chunks');
-- Should return: 3 rows

SELECT COUNT(*) FROM insurers;
-- Should return: 3 (if sample data loaded)
```

**Poojitha runs**:
```bash
# In project root
node test-connection.js
```

Expected output:
```
✓ Environment variables loaded
✓ Connected to Supabase
✓ pgvector extension verified
✓ All tables exist
✓ Sample data found (if loaded)
```

### Troubleshooting Common Issues

**Issue 1: Connection Failed**
- Check SUPABASE_URL format
- Verify SUPABASE_KEY is correct
- Check firewall/network settings

**Issue 2: pgvector Not Found**
- Re-run: `CREATE EXTENSION IF NOT EXISTS vector;`
- Check Supabase version (needs PostgreSQL 14+)
- Contact Supabase support if persistent

**Issue 3: Tables Missing**
- Re-run migration script
- Check for SQL errors in Supabase logs
- Verify migration file copied completely

---

## 📝 Environment Variables

### Poojitha's .env
```env
# Supabase (from Surendra)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...

# Vertex AI
VERTEX_AI_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=europe-west3
VERTEX_AI_EMBEDDING_MODEL=textembedding-gecko@003
VERTEX_AI_LLM_MODEL=gemini-1.5-flash

# Server
PORT=3000
NODE_ENV=development
```

### Surendra's .env (if needed)
```env
# Supabase (for local testing)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...

# Database Direct Connection (if needed)
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- [ ] Both have access to same codebase
- [ ] Surendra successfully deployed database
- [ ] Poojitha can connect to database
- [ ] test-connection.js passes all checks
- [ ] Both understand folder structure

### Phase 2 Complete When:
- [ ] Sample data loaded and queryable
- [ ] Poojitha can fetch insurers via API
- [ ] Poojitha can fetch chunks via API
- [ ] No connection errors

### Phase 3 Complete When:
- [ ] Vector search function works
- [ ] Embeddings can be inserted
- [ ] Similarity queries return results
- [ ] Ready for real data ingestion

---

## 🔮 Next Steps After Coordination

### Immediate (Week 1)
1. Complete database setup
2. Verify connection working
3. Test with sample data
4. Review and finalize .env variables

### Short-term (Week 2-3)
1. Implement Vertex AI embedding generation
2. Build data ingestion pipeline
3. Load real insurance documents
4. Test end-to-end RAG flow

### Medium-term (Week 4+)
1. Optimize vector search performance
2. Add more insurance companies
3. Implement caching layer
4. Deploy to production

---

## 📞 Contact Information

**Poojitha** (Backend Developer):
- Role: Express.js backend, API endpoints, RAG logic
- Email: [your-email]
- Availability: [your-hours]

**Surendra** (Database Engineer):
- Role: Supabase setup, schema deployment, pgvector
- Email: [surendra-email]
- Availability: [surendra-hours]

---

## 📚 Quick Reference Links

### For Surendra
- **Schema Design**: `docs/day2-schema-design.md`
- **Migration Guide**: `docs/day9-schema-finalization.md`
- **Supabase Setup**: `docs/supabase-setup.md`
- **Migration File**: `db/migrations/001_initial_schema.sql`

### For Poojitha
- **Architecture**: `docs/day1-architecture.md`
- **RAG Pipeline**: `docs/day4-rag-diagrams.md`
- **Express Patterns**: `docs/day3-patterns.md`

### For Both
- **README**: Project overview and setup
- **API Docs**: (TODO - add Swagger/OpenAPI)
- **Data Processing**: `scripts/data-processing/README.md`

---

## ✅ Repository Alignment Checklist

Before considering Task 10 complete:

- [ ] Repository is cloned/accessible by Surendra
- [ ] Folder structure verified and agreed upon
- [ ] Data processing scripts folder created (`scripts/data-processing/`)
- [ ] README documentation updated with structure
- [ ] Both can run backend locally (after DB setup)
- [ ] This coordination guide reviewed together
- [ ] Communication channels established
- [ ] Next steps clearly defined

---

**Status**: Ready for handoff to Surendra
**Last Updated**: December 7, 2025
**Version**: 1.0
