/**
 * Check actual database schema columns
 */

import supabase from './src/db/supabase.js';

async function checkSchema() {
  console.log('🔍 Checking actual database schema...\n');

  try {
    // Insert a test insurer with minimal fields to see what's accepted
    console.log('Attempting to insert minimal insurer...');
    const { data, error } = await supabase
      .from('insurers')
      .insert([{ name: `Schema Test ${Date.now()}` }])
      .select();

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Details:`, error);
    } else {
      console.log('✅ Insert successful!');
      console.log('   Columns in result:', Object.keys(data[0]));
      console.log('   Data:', data[0]);
    }

    // Try to query existing data
    console.log('\nQuerying existing insurers...');
    const { data: insurers, error: queryError } = await supabase
      .from('insurers')
      .select('*')
      .limit(5);

    if (queryError) {
      console.log(`❌ Query Error: ${queryError.message}`);
    } else {
      console.log(`✅ Query successful! Found ${insurers.length} insurers`);
      if (insurers.length > 0) {
        console.log('   Available columns:', Object.keys(insurers[0]));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
