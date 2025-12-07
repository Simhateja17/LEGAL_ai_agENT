// Test Supabase Database Connection
// Run: node test-connection.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Testing Supabase Connection...\n');

// Validate environment variables
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set in .env file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is not set in .env file');
  process.exit(1);
}

console.log('✅ Environment variables found:');
console.log(`   SUPABASE_URL: ${supabaseUrl}`);
console.log(`   SUPABASE_SERVICE_KEY: ${supabaseServiceKey.substring(0, 20)}...`);
console.log('');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('📡 Attempting to connect to Supabase...');
    
    // Test 1: Basic connection test
    console.log('\n1️⃣ Testing database connection...');
    
    // Try to query a system table to verify connection
    const { data: healthData, error: healthError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (healthError) {
      console.log('   ⚠️  Direct table query returned:', healthError.message);
    } else {
      console.log('   ✅ Database connection successful!');
    }

    // Test 2: Check pgvector extension (requires manual verification)
    console.log('\n2️⃣ Checking pgvector extension...');
    console.log('   ℹ️  pgvector verification requires manual SQL query');
    console.log('   📝 Please run: db/verify-pgvector.sql in Supabase SQL Editor');
    console.log('   Expected query: SELECT * FROM pg_extension WHERE extname = \'vector\';');

    // Test 3: Check if schema tables exist
    console.log('\n3️⃣ Checking for project tables...');
    const { data: insurersData, error: insurersError } = await supabase
      .from('insurers')
      .select('count')
      .limit(1);

    if (insurersError && insurersError.code === '42P01') {
      console.log('   ⚠️  Tables not created yet');
      console.log('   📝 Please run: db/schema.sql in Supabase SQL Editor');
    } else if (insurersError) {
      console.log(`   ⚠️  Error checking tables: ${insurersError.message}`);
    } else {
      console.log('   ✅ Project tables exist!');
    }

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ CONNECTION TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('   1. Run db/schema.sql in Supabase SQL Editor (if tables missing)');
    console.log('   2. Run db/verify-pgvector.sql to verify vector extension');
    console.log('   3. Start the server: npm run dev');
    console.log('   4. Test API: curl http://localhost:3000/api/health\n');

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\n📋 Troubleshooting:');
    console.error('   1. Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    console.error('   2. Check Supabase project status at https://supabase.com/dashboard');
    console.error('   3. Ensure service role key is used (not anon key)');
    console.error('   4. Check network connectivity and firewall settings\n');
    process.exit(1);
  }
}

// Run the test
testConnection();
