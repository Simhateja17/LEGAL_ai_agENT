# 🚀 Quick Setup Reference Card

## New Supabase Account
**Email:** suriavula711@gmail.com  
**Password:** suriteja123

---

## ⚡ Quick Steps (5 minutes)

### 1️⃣ Login & Create Project
1. Go to: https://supabase.com/dashboard
2. Login with credentials above
3. Click **"New Project"**
4. Fill in:
   - Name: `german-insurance-backend`
   - Password: **(Choose & SAVE IT!)**
   - Region: `Europe (Frankfurt)`
5. Wait 2-3 minutes

### 2️⃣ Run SQL Schema
1. Click **SQL Editor** (left sidebar)
2. Click **"+ New query"**
3. Copy ALL content from: `db/complete-schema-setup.sql`
4. Paste and click **RUN**

### 3️⃣ Verify Setup
Run this in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

Should show:
- ✅ insurers
- ✅ documents
- ✅ document_chunks

### 4️⃣ Get Your Credentials
1. Go to **Project Settings** → **API**
2. Copy these values:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

3. Go to **Project Settings** → **Database**
4. Copy connection string

---

## 📋 Files You Need

| File | Purpose |
|------|---------|
| `NEW_SUPABASE_SETUP_GUIDE.md` | Full detailed guide |
| `db/complete-schema-setup.sql` | SQL to run in Supabase |
| This file | Quick reference |

---

## ✅ Success Checklist

- [ ] Logged into Supabase
- [ ] Created new project
- [ ] Saved database password
- [ ] Ran complete-schema-setup.sql
- [ ] Verified 3 tables created
- [ ] Copied API keys
- [ ] Copied database connection string
- [ ] Updated .env file

---

## 🆘 Common Issues

**Can't login?**
- Check email/password spelling
- Try password reset

**SQL errors?**
- Make sure you copied the ENTIRE SQL file
- Check if pgvector is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`

**Tables not showing?**
- Refresh the page
- Check SQL Editor for error messages
- Verify you're in the correct project

---

## 📞 What's Next?

After setup:
1. Test connection from your app
2. Load your insurance data
3. Test RAG queries

---

## 🔗 Important Links

- Supabase Dashboard: https://supabase.com/dashboard
- Your Project: (will be available after creation)
- SQL Editor: (in your project dashboard)
- API Settings: Project Settings → API
- Database Settings: Project Settings → Database

---

**Created:** 2025-12-27  
**For:** German Insurance RAG Backend  
**Database:** PostgreSQL with pgvector
