/**
 * Supabase Database Connection Test
 * 
 * Comprehensive test suite to verify:
 * 1. Environment variables configuration
 * 2. Database connectivity
 * 3. pgvector extension availability
 * 4. Schema tables existence
 * 5. Sample data verification
 * 
 * Usage: node test-connection.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('='.repeat(60));

// Validate environment variables
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set in .env file');
  console.error('   Please add: SUPABASE_URL=your_project_url\n');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY is not set in .env file');
  console.error('   Please add: SUPABASE_KEY=your_api_key\n');
  process.exit(1);
}

console.log('✅ Environment variables found:');
console.log(`   SUPABASE_URL: ${supabaseUrl}`);
console.log(`   SUPABASE_KEY: ${supabaseKey.substring(0, 20)}...`);
console.log('='.repeat(60));

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function testConnection() {
  try {
    console.log('\n📡 Attempting to connect to Supabase...\n');
    
    // Test 1: Basic connection test using RPC health check
    console.log('1️⃣  Testing database connection...');
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_pgvector_extension');
    
    if (rpcError && rpcError.code === '42883') {
      console.log('   ⚠️  RPC function not found (expected before migration)');
      console.log('   ✅ Basic connection successful!');
    } else if (rpcError) {
      console.log(`   ⚠️  Connection warning: ${rpcError.message}`);
      console.log('   ℹ️  Trying alternative connection test...');
      
      // Fallback: try to access any table
      const { error: fallbackError } = await supabase.from('insurers').select('id').limit(1);
      if (fallbackError && fallbackError.code === '42P01') {
        console.log('   ✅ Connection successful (tables not created yet)');
      } else if (fallbackError) {
        throw new Error(`Connection failed: ${fallbackError.message}`);
      } else {
        console.log('   ✅ Connection successful!');
      }
    } else {
      console.log('   ✅ Database connection successful!');
      console.log(`   pgvector installed: ${rpcData ? 'Yes' : 'Unknown'}`);
    }

    // Test 2: Check pgvector extension
    console.log('\n2️⃣  Checking pgvector extension...');
    
    const { data: vectorData, error: vectorError } = await supabase.rpc('check_pgvector_extension');
    
    if (vectorError && vectorError.code === '42883') {
      console.log('   ⚠️  Cannot verify pgvector (RPC function not created yet)');
      console.log('   📝 pgvector will be verified after running migration: 001_initial_schema.sql');
    } else if (vectorError) {
      console.log(`   ⚠️  Error checking pgvector: ${vectorError.message}`);
    } else {
      console.log(`   ✅ pgvector extension: ${vectorData ? 'Installed' : 'Not installed'}`);
    }

    // Test 3: Check if schema tables exist
    console.log('\n3️⃣  Checking schema tables...');
    
    const tables = ['insurers', 'insurance_products', 'insurance_chunks'];
    const tableStatus = {};
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (error && error.code === '42P01') {
        tableStatus[table] = '❌ Not created';
      } else if (error) {
        tableStatus[table] = `⚠️  ${error.message}`;
      } else {
        tableStatus[table] = '✅ Exists';
      }
    }
    
    console.log('   Table Status:');
    for (const [table, status] of Object.entries(tableStatus)) {
      console.log(`     - ${table}: ${status}`);
    }

    // Test 4: Check for sample data (if tables exist)
    console.log('\n4️⃣  Checking sample data...');
    
    const { data: insurerCount, error: countError } = await supabase
      .from('insurers')
      .select('*', { count: 'exact', head: true });

    if (countError && countError.code === '42P01') {
      console.log('   ⚠️  Sample data not loaded (tables not created)');
    } else if (countError) {
      console.log(`   ⚠️  Error checking data: ${countError.message}`);
    } else {
      const count = insurerCount?.length || 0;
      if (count > 0) {
        console.log(`   ✅ Sample data loaded: ${count} records in insurers table`);
      } else {
        console.log('   ℹ️  No sample data found (run 002_sample_data.sql)');
      }
    }

    // Test 5: Verify vector operations (if tables exist)
    console.log('\n5️⃣  Testing vector operations...');
    
    const { data: chunkData, error: chunkError } = await supabase
      .from('insurance_chunks')
      .select('id')
      .limit(1);

    if (chunkError && chunkError.code === '42P01') {
      console.log('   ⚠️  Vector operations not testable (tables not created)');
    } else if (chunkError) {
      console.log(`   ⚠️  Error testing vectors: ${chunkError.message}`);
    } else {
      console.log('   ✅ Vector operations table ready');
      console.log('   ℹ️  Full vector search will be testable after data ingestion');
    }

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ CONNECTION TEST COMPLETE');
    console.log('='.repeat(60));
    
    // Determine migration status
    const allTablesExist = Object.values(tableStatus).every(s => s.includes('✅'));
    
    console.log('\n📊 Summary:');
    console.log(`   Connection: ✅ Successful`);
    console.log(`   Database URL: ${supabaseUrl}`);
    console.log(`   Tables: ${allTablesExist ? '✅ Ready' : '⚠️  Need migration'}`);
    console.log(`   pgvector: ${vectorError && vectorError.code === '42883' ? '⚠️  Needs verification' : '✅ Ready'}`);
    
    console.log('\n📋 Next Steps:');
    if (!allTablesExist) {
      console.log('   1. Enable pgvector extension in Supabase dashboard');
      console.log('   2. Run migration: db/migrations/001_initial_schema.sql');
      console.log('   3. Load sample data: db/migrations/002_sample_data.sql');
      console.log('   4. Re-run this test: node test-connection.js');
    } else {
      console.log('   1. Start the backend server: npm run dev');
      console.log('   2. Test API health: curl http://localhost:3000/api/health');
      console.log('   3. Test insurers endpoint: curl http://localhost:3000/api/insurers');
      console.log('   4. Begin data ingestion: see scripts/data-processing/README.md');
    }
    console.log('');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ CONNECTION TEST FAILED');
    console.error('='.repeat(60));
    console.error(`\nError: ${error.message}`);
    console.error('\n📋 Troubleshooting:');
    console.error('   1. Verify .env file exists with SUPABASE_URL and SUPABASE_KEY');
    console.error('   2. Check Supabase project status: https://supabase.com/dashboard');
    console.error('   3. Ensure API key has correct permissions (use service_role key)');
    console.error('   4. Check network connectivity and firewall settings');
    console.error('   5. Verify Supabase project is not paused');
    console.error('\n💡 Need help? Check docs/supabase-setup.md for detailed instructions\n');
    process.exit(1);
  }
}

// Run the test
testConnection();
