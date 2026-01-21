/**
 * Test Supabase Connection
 * 
 * Verifies that Supabase credentials are configured correctly
 * and the database connection is working.
 * 
 * Run with: node test-supabase-connection.js
 */

import dotenv from 'dotenv';
dotenv.config();

import supabase from './src/db/supabase.js';

const divider = '='.repeat(70);

async function testConnection() {
  console.log('\n' + divider);
  console.log('🔗 SUPABASE CONNECTION TEST');
  console.log(divider + '\n');

  // Check environment variables
  console.log('📋 Configuration Check:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_KEY: ${process.env.SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.log('❌ ERROR: Supabase credentials not configured in .env file');
    console.log('\n📖 Please follow the SUPABASE_CONNECTION_GUIDE.md to set up your credentials.\n');
    process.exit(1);
  }

  if (!supabase) {
    console.log('❌ ERROR: Supabase client not initialized');
    process.exit(1);
  }

  console.log('✅ Supabase client initialized\n');

  // Test 1: Check if tables exist
  console.log('📋 TEST 1: Checking database tables');
  console.log('─'.repeat(50));

  try {
    const { data: insurersData, error: insurersError } = await supabase
      .from('insurers')
      .select('*')
      .limit(1);

    if (insurersError) {
      if (insurersError.code === '42P01') {
        console.log('   ⚠️  Table "insurers" does not exist');
        console.log('   Run the SQL setup from SUPABASE_CONNECTION_GUIDE.md\n');
      } else {
        console.log('   ❌ Error querying insurers:', insurersError.message);
      }
    } else {
      console.log('   ✅ Table "insurers" exists');
      console.log(`   Found ${insurersData?.length || 0} sample records\n`);
    }
  } catch (error) {
    console.log('   ❌ Connection error:', error.message, '\n');
  }

  // Test 2: Check insurance_documents table
  console.log('📋 TEST 2: Checking insurance_documents table');
  console.log('─'.repeat(50));

  try {
    const { data: docsData, error: docsError } = await supabase
      .from('insurance_documents')
      .select('id, insurer_name, insurance_type, document_title')
      .limit(5);

    if (docsError) {
      if (docsError.code === '42P01') {
        console.log('   ⚠️  Table "insurance_documents" does not exist');
        console.log('   Run the SQL setup from SUPABASE_CONNECTION_GUIDE.md\n');
      } else {
        console.log('   ❌ Error:', docsError.message, '\n');
      }
    } else {
      console.log('   ✅ Table "insurance_documents" exists');
      console.log(`   Found ${docsData?.length || 0} documents\n`);
      
      if (docsData && docsData.length > 0) {
        console.log('   Sample documents:');
        docsData.forEach((doc, i) => {
          console.log(`     ${i + 1}. ${doc.insurer_name} - ${doc.insurance_type}`);
        });
        console.log();
      }
    }
  } catch (error) {
    console.log('   ❌ Connection error:', error.message, '\n');
  }

  // Test 3: Check pgvector extension
  console.log('📋 TEST 3: Checking pgvector extension');
  console.log('─'.repeat(50));

  try {
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: new Array(768).fill(0),
      match_count: 1,
      similarity_threshold: 0.5
    });

    if (error) {
      if (error.code === '42883') {
        console.log('   ⚠️  Function "search_similar_chunks" does not exist');
        console.log('   Run the SQL setup from SUPABASE_CONNECTION_GUIDE.md\n');
      } else {
        console.log('   ❌ Error:', error.message, '\n');
      }
    } else {
      console.log('   ✅ pgvector search function is configured');
      console.log(`   Test query returned ${data?.length || 0} results\n`);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
  }

  // Summary
  console.log(divider);
  console.log('📊 CONNECTION TEST SUMMARY');
  console.log(divider);
  console.log(`
✅ Supabase client: Connected
📍 Database URL: ${process.env.SUPABASE_URL}

Next steps:
1. If tables don't exist, run the SQL setup from SUPABASE_CONNECTION_GUIDE.md
2. Upload your insurance documents with embeddings
3. Test the RAG pipeline with: node test-rag-pipeline.js
4. Start the server with: npm start

For detailed setup instructions, see: SUPABASE_CONNECTION_GUIDE.md
`);
  console.log(divider + '\n');
}

testConnection().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
