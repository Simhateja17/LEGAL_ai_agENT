# 📸 Visual Step-by-Step Guide
## Setting Up New Supabase Database

This guide provides detailed visual instructions for setting up your new Supabase database.

---

## 🎯 Overview

You will:
1. Login to Supabase
2. Create a new project
3. Run SQL schema
4. Get API credentials
5. Verify setup

**Time Required:** ~10 minutes

---

## Step 1: Login to Supabase

### 1.1 Navigate to Supabase
- Open browser and go to: **https://supabase.com/dashboard**

### 1.2 Click Sign In
- Look for "Sign In" button in top right corner
- Click it

### 1.3 Enter Credentials
```
Email: suriavula711@gmail.com
Password: suriteja123
```

### 1.4 Click Sign In Button
- You should see the Supabase dashboard

**What you'll see:**
- Dashboard with list of projects (may be empty)
- "New Project" button
- Sidebar with navigation

---

## Step 2: Create New Project

### 2.1 Click "New Project"
- Look for "+ New project" button
- It's usually in the top right or center of the page

### 2.2 Fill in Project Details

**Organization:**
- If prompted, select or create an organization
- Default organization name is fine

**Project Name:**
```
german-insurance-backend
```
(or any name you prefer)

**Database Password:**
- Choose a STRONG password
- ⚠️ **CRITICAL:** Write this down! You'll need it later
- Example: `MySecurePass123!@#`
- Click the "Generate a password" button for a secure one

**Region:**
- Select: **Europe (Frankfurt) - eu-central-1**
- (Closest to Germany for best performance)

**Pricing Plan:**
- Select: **Free** (for testing)
- Or **Pro** if you need more resources

### 2.3 Click "Create new project"
- Wait 2-3 minutes for provisioning
- You'll see a progress indicator

**What you'll see:**
- "Setting up your project..." message
- Progress bar
- Eventually: "Your project is ready!"

---

## Step 3: Navigate to SQL Editor

### 3.1 Wait for Project to be Ready
- Green checkmark appears
- Dashboard loads

### 3.2 Find SQL Editor
- Look at left sidebar
- Click on **"SQL Editor"** icon
  - It looks like: `</>`

### 3.3 Create New Query
- Click **"+ New query"** button
- Or click **"New query"** in the center

**What you'll see:**
- Empty SQL editor window
- "Run" button in top right
- Query name field at top

---

## Step 4: Run Database Schema

### 4.1 Open the SQL File
On your computer:
1. Navigate to: `c:\Users\suria\OneDrive\Desktop\german_insurance_backend\db\`
2. Open file: `complete-schema-setup.sql`
3. Select ALL content (Ctrl+A)
4. Copy (Ctrl+C)

### 4.2 Paste into SQL Editor
In Supabase SQL Editor:
1. Click in the editor area
2. Paste (Ctrl+V)
3. You should see ~200 lines of SQL

### 4.3 Name Your Query (Optional)
- At the top, you can name it: "Initial Schema Setup"

### 4.4 Run the SQL
- Click **"RUN"** button (top right)
- Or press: **Ctrl + Enter**

### 4.5 Wait for Completion
- Progress indicator appears
- Should take 5-10 seconds

**What you'll see:**
- "Success" message in green
- Or error messages if something went wrong
- Results panel at bottom showing execution results

---

## Step 5: Verify Tables Created

### 5.1 Clear the SQL Editor
- Select all (Ctrl+A)
- Delete

### 5.2 Run Verification Query
Paste this query:
```sql
SELECT table_name, 
       (SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 5.3 Click RUN

**Expected Results:**
You should see 3 tables:
```
table_name          | column_count
--------------------|-------------
document_chunks     | 8
documents           | 10
insurers            | 9
```

✅ If you see these 3 tables, SUCCESS!

---

## Step 6: Get API Credentials

### 6.1 Open Project Settings
- Click **gear icon** (⚙️) in left sidebar
- Or click **"Project Settings"** at bottom of sidebar

### 6.2 Navigate to API Settings
- In settings menu, click **"API"**

### 6.3 Copy Project URL
Look for **"Project URL"** section:
```
URL: https://xxxxxxxxxxxxx.supabase.co
```
- Click the copy icon
- Save this in a text file

### 6.4 Copy API Keys

**Anon (public) key:**
- Look for "anon public" section
- Click "Reveal" if hidden
- Click copy icon
- Save this in your text file

**Service Role key:**
- Look for "service_role" section  
- Click "Reveal" if hidden
- Click copy icon
- ⚠️ **KEEP THIS SECRET!**
- Save this in your text file

---

## Step 7: Get Database Connection Details

### 7.1 Navigate to Database Settings
- Still in Project Settings
- Click **"Database"** in left menu

### 7.2 Find Connection Info

Look for **"Connection info"** section:

**Host:**
```
db.xxxxxxxxxxxxx.supabase.co
```

**Database name:**
```
postgres
```

**Port:**
```
5432
```

**User:**
```
postgres
```

**Password:**
- This is the password YOU set in Step 2.2
- If you forgot it, you can reset it here

### 7.3 Copy Connection String (Optional)
- Look for "Connection string" section
- Select "URI" tab
- Copy the full string
- Replace `[YOUR-PASSWORD]` with your actual password

---

## Step 8: Create .env.new File

### 8.1 Open Template File
On your computer:
1. Navigate to: `c:\Users\suria\OneDrive\Desktop\german_insurance_backend\`
2. Open: `.env.new.template`

### 8.2 Fill in Values
Replace the empty values with what you copied:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YourPasswordFromStep2
```

### 8.3 Save As .env.new
- Save the file as: `.env.new` (remove .template)
- Location: `c:\Users\suria\OneDrive\Desktop\german_insurance_backend\.env.new`

---

## Step 9: Verify Setup with Script

### 9.1 Open Terminal
- In VS Code: Terminal → New Terminal
- Or open PowerShell in project folder

### 9.2 Run Verification Script
```powershell
node verify-new-supabase.js
```

### 9.3 Check Results

**Expected Output:**
```
🔍 Verifying New Supabase Database Setup...
============================================================

✓ Found credentials in .env.new
  URL: https://xxxxxxxxxxxxx.supabase.co

📦 Checking pgvector extension...
  ✅ pgvector extension is enabled

📋 Checking insurers table...
  ✅ insurers table exists
     Rows: 0

📄 Checking documents table...
  ✅ documents table exists
     Rows: 0

🧩 Checking document_chunks table...
  ✅ document_chunks table exists
     Rows: 0

✍️  Testing insert capability...
  ✅ Can insert into insurers table
     Created insurer: Test Insurer 1735285271234
  ✅ Can delete from insurers table

🔗 Testing foreign key relationships...
  ✅ Foreign key constraints are working

============================================================
📊 VERIFICATION SUMMARY
============================================================
✅ pgvector extension: PASS
✅ insurers table: PASS
✅ documents table: PASS
✅ document_chunks table: PASS
✅ Insert/Delete capability: PASS
✅ Foreign key constraints: PASS

============================================================
Total Tests: 6
✅ Passed: 6
❌ Failed: 0
Success Rate: 100%
============================================================

🎉 SUCCESS! Your new Supabase database is set up correctly!
```

---

## ✅ Setup Complete!

Congratulations! Your new Supabase database is ready.

### What You Have Now:
- ✅ New Supabase project
- ✅ 3 tables created (insurers, documents, document_chunks)
- ✅ All indexes and constraints
- ✅ pgvector extension enabled
- ✅ API credentials saved
- ✅ Verified working setup

### Next Steps:
1. **Update your main .env file** with new credentials
2. **Load your data** using upload scripts
3. **Test RAG queries** with vector search

---

## 🆘 Troubleshooting

### Issue: Can't login
**Solution:**
- Double-check email and password
- Try password reset
- Check if account is verified

### Issue: SQL errors when running schema
**Solution:**
- Make sure you copied the ENTIRE file
- Check for any syntax errors
- Try running in smaller sections
- Check Supabase status: https://status.supabase.com/

### Issue: Tables not showing
**Solution:**
- Refresh the page
- Check SQL Editor for error messages
- Verify you're in the correct project
- Check the "Table Editor" in sidebar

### Issue: Verification script fails
**Solution:**
- Check .env.new file has correct values
- Verify API keys are copied completely
- Make sure project is fully provisioned
- Check internet connection

### Issue: Can't find API keys
**Solution:**
- Go to Project Settings (gear icon)
- Click "API" in left menu
- Click "Reveal" to show keys
- Make sure you're in the correct project

---

## 📞 Need More Help?

- Check Supabase docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Check your project logs in dashboard
- Review the detailed guide: `NEW_SUPABASE_SETUP_GUIDE.md`

---

**Created:** 2025-12-27  
**Version:** 1.0  
**For:** German Insurance RAG Backend
