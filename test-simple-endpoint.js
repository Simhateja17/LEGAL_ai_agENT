/**
 * Simple test for insurers endpoint with current schema
 * This works with the minimal schema (id, name only)
 */

import { insertInsurer } from './src/db/queries.js';

async function setupMinimalTestData() {
  console.log('🔧 Setting up minimal test data (name only)...\n');
  
  const testInsurers = [
    { name: 'Allianz Versicherung' },
    { name: 'HUK-COBURG Versicherung' },
    { name: 'ERGO Versicherungsgruppe' },
    { name: 'Ärzteversicherung München' },
    { name: 'Münchener Rück' },
    { name: 'Öffentliche Versicherung Berlin' },
    { name: 'Deutsche Versicherung' },
    { name: 'Signal Iduna' },
  ];

  let created = 0;
  
  for (const insurer of testInsurers) {
    try {
      const result = await insertInsurer(insurer);
      console.log(`✅ Created: ${result.name}`);
      created++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⏭️  Skipped (exists): ${insurer.name}`);
      } else {
        console.log(`❌ Failed: ${insurer.name}`);
      }
    }
  }
  
  console.log(`\n✅ Test data ready: ${created} new insurers created\n`);
}

async function testWithFetch() {
  console.log('🧪 Testing API Endpoint with HTTP requests\n');
  
  const baseUrl = 'http://localhost:3000/api/insurers';
  
  const tests = [
    { name: 'All insurers', url: baseUrl },
    { name: 'Search: Allianz', url: `${baseUrl}?search=Allianz` },
    { name: 'Search: Ärzte (German ä)', url: `${baseUrl}?search=Ärzte` },
    { name: 'Search: München (German ü)', url: `${baseUrl}?search=München` },
    { name: 'Search: Öffentliche (German ö)', url: `${baseUrl}?search=Öffentliche` },
    { name: 'Pagination: limit=2', url: `${baseUrl}?limit=2` },
    { name: 'Pagination: limit=2&offset=2', url: `${baseUrl}?limit=2&offset=2` },
    { name: 'Partial: vers', url: `${baseUrl}?search=vers` },
  ];

  console.log('Testing against running server...\n');
  
  for (const test of tests) {
    try {
      console.log(`📍 ${test.name}`);
      const response = await fetch(test.url);
      const data = await response.json();
      
      if (data.success) {
        console.log(`   ✅ Success: ${data.pagination.count} results`);
        if (data.data.length > 0) {
          console.log(`   First result: ${data.data[0].name}`);
        }
      } else {
        console.log(`   ❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.message.includes('fetch failed')) {
        console.log('   ⚠️  Server not running? Start with: npm start\n');
        break;
      }
    }
    console.log();
  }
}

async function run() {
  try {
    await setupMinimalTestData();
    
    console.log('=' .repeat(70));
    console.log('🚀 Ready to test!\n');
    console.log('Start the server in another terminal:');
    console.log('   npm start\n');
    console.log('Then run tests:');
    console.log('   node test-simple-endpoint.js\n');
    console.log('Or test manually in browser:');
    console.log('   http://localhost:3000/api/insurers?search=Allianz\n');
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

run();
