/**
 * Apply Database Schema to Supabase
 * 
 * This script runs the schema.sql file against the Supabase database
 */

import { readFileSync } from 'fs';
import supabase from './src/db/supabase.js';

async function applySchema() {
  console.log('📦 Applying database schema...\n');

  try {
    // Read the schema file
    const schemaSQL = readFileSync('./db/schema.sql', 'utf-8');
    
    console.log('📄 Schema file loaded');
    console.log(`   Length: ${schemaSQL.length} characters\n`);

    // Note: Supabase JS client doesn't support raw SQL execution
    // You need to run this in the Supabase SQL Editor or via psql
    
    console.log('⚠️  IMPORTANT: The Supabase JS client cannot execute raw SQL.');
    console.log('📝 To apply the schema, you have two options:\n');
    
    console.log('Option 1: Via Supabase Dashboard (Recommended)');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Click on "SQL Editor" in the left sidebar');
    console.log('   4. Copy and paste the contents of db/schema.sql');
    console.log('   5. Click "Run" to execute\n');
    
    console.log('Option 2: Via Command Line (Using psql)');
    console.log('   You need the database connection string from Supabase:');
    console.log('   1. Go to Project Settings > Database');
    console.log('   2. Copy the Connection String (Direct connection)');
    console.log('   3. Run: psql "your-connection-string" -f db/schema.sql\n');

    console.log('✅ After applying the schema, run: node test-db-queries.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applySchema();
