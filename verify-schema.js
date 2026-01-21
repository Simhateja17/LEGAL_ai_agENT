/**
 * Verify Database Schema
 */

import supabase from './src/db/supabase.js';

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');

  try {
    // Test 1: Check insurers table structure
    console.log('📋 Test 1: Check insurers table');
    const { data: insurers, error: insurersError } = await supabase
      .from('insurers')
      .select('*')
      .limit(1);

    if (insurersError) {
      console.log(`❌ Insurers table error: ${insurersError.message}`);
    } else {
      console.log(`✅ Insurers table exists`);
      console.log(`   Sample columns: ${Object.keys(insurers[0] || {}).join(', ') || 'No data yet'}`);
    }

    // Test 2: Check documents table structure
    console.log('\n📋 Test 2: Check documents table');
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);

    if (documentsError) {
      console.log(`❌ Documents table error: ${documentsError.message}`);
    } else {
      console.log(`✅ Documents table exists`);
      console.log(`   Sample columns: ${Object.keys(documents[0] || {}).join(', ') || 'No data yet'}`);
    }

    // Test 3: Check document_chunks table structure
    console.log('\n📋 Test 3: Check document_chunks table');
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(1);

    if (chunksError) {
      console.log(`❌ Document chunks table error: ${chunksError.message}`);
    } else {
      console.log(`✅ Document chunks table exists`);
      console.log(`   Sample columns: ${Object.keys(chunks[0] || {}).join(', ') || 'No data yet'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifySchema();
