/**
 * Test GET /api/insurers Endpoint
 * 
 * Tests the search functionality with:
 * - Search by name
 * - Filter by insurance_type
 * - Pagination
 * - German character support
 */

import { insertInsurer } from './src/db/queries.js';

async function setupTestData() {
  console.log('🔧 Setting up test data...\n');
  
  const testInsurers = [
    {
      name: 'Allianz Versicherung',
      description: 'Leading German insurance company',
      website: 'https://www.allianz.de',
      insurance_types: ['health', 'life', 'auto', 'home'],
      contact_email: 'info@allianz.de',
      contact_phone: '+49 89 3800 0',
    },
    {
      name: 'HUK-COBURG',
      description: 'Major German auto insurance provider',
      website: 'https://www.huk.de',
      insurance_types: ['auto', 'liability'],
      contact_email: 'service@huk.de',
      contact_phone: '+49 9561 96 0',
    },
    {
      name: 'ERGO Versicherungsgruppe',
      description: 'One of the major insurance groups in Germany',
      website: 'https://www.ergo.de',
      insurance_types: ['health', 'life', 'home'],
      contact_email: 'kontakt@ergo.de',
      contact_phone: '+49 211 477 0',
    },
    {
      name: 'Ärzteversicherung München',
      description: 'Insurance for medical professionals - tests German ä',
      website: 'https://www.aerzte-versicherung.de',
      insurance_types: ['health', 'liability'],
      contact_email: 'info@aerzte-versicherung.de',
      contact_phone: '+49 89 1234 5678',
    },
    {
      name: 'Münchener Rück',
      description: 'Munich Re - tests German ü',
      website: 'https://www.munichre.com',
      insurance_types: ['life', 'health'],
      contact_email: 'info@munichre.com',
      contact_phone: '+49 89 3891 0',
    },
    {
      name: 'Öffentliche Versicherung',
      description: 'Public insurance - tests German ö',
      website: 'https://www.oeffentliche.de',
      insurance_types: ['auto', 'home'],
      contact_email: 'info@oeffentliche.de',
      contact_phone: '+49 30 1234 5678',
    },
  ];

  const created = [];
  
  for (const insurer of testInsurers) {
    try {
      const result = await insertInsurer(insurer);
      created.push(result);
      console.log(`✅ Created: ${result.name}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⏭️  Skipped (exists): ${insurer.name}`);
      } else {
        console.log(`❌ Failed: ${insurer.name} - ${error.message}`);
      }
    }
  }
  
  console.log(`\n✅ Test data ready: ${created.length} new insurers created\n`);
  return created;
}

async function testEndpoint() {
  console.log('🧪 Testing GET /api/insurers Endpoint\n');
  console.log('Starting server test...\n');
  
  // Note: This requires the server to be running
  // Run: npm start (in another terminal)
  
  const baseUrl = 'http://localhost:3000/api/insurers';
  
  const tests = [
    {
      name: 'Test 1: Get all insurers (no filters)',
      url: `${baseUrl}`,
    },
    {
      name: 'Test 2: Search by name - "Allianz"',
      url: `${baseUrl}?search=Allianz`,
    },
    {
      name: 'Test 3: Search with German ä - "Ärzte"',
      url: `${baseUrl}?search=Ärzte`,
    },
    {
      name: 'Test 4: Search with German ü - "München"',
      url: `${baseUrl}?search=München`,
    },
    {
      name: 'Test 5: Search with German ö - "Öffentliche"',
      url: `${baseUrl}?search=Öffentliche`,
    },
    {
      name: 'Test 6: Filter by insurance_type - "health"',
      url: `${baseUrl}?insurance_type=health`,
    },
    {
      name: 'Test 7: Filter by insurance_type - "auto"',
      url: `${baseUrl}?insurance_type=auto`,
    },
    {
      name: 'Test 8: Combined search - "versicherung" + type "health"',
      url: `${baseUrl}?search=versicherung&insurance_type=health`,
    },
    {
      name: 'Test 9: Pagination - limit 2',
      url: `${baseUrl}?limit=2`,
    },
    {
      name: 'Test 10: Pagination - limit 2, offset 2',
      url: `${baseUrl}?limit=2&offset=2`,
    },
    {
      name: 'Test 11: Case insensitive search - "allianz" (lowercase)',
      url: `${baseUrl}?search=allianz`,
    },
    {
      name: 'Test 12: Partial match - "vers"',
      url: `${baseUrl}?search=vers`,
    },
  ];

  console.log('⚠️  Make sure the server is running: npm start\n');
  console.log('You can test these URLs manually or use the test script below:\n');
  console.log('='.repeat(70) + '\n');
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`${test.name}`);
    console.log(`URL: ${test.url}\n`);
  }
  
  console.log('='.repeat(70) + '\n');
  console.log('💡 To test with curl:\n');
  console.log('curl "http://localhost:3000/api/insurers?search=Allianz"\n');
  console.log('💡 Or open in browser:\n');
  console.log('http://localhost:3000/api/insurers?search=Allianz\n');
}

async function runTests() {
  try {
    // First setup test data
    await setupTestData();
    
    // Then provide test instructions
    await testEndpoint();
    
    console.log('✅ Test setup complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Test the URLs listed above');
    console.log('   3. Verify search, pagination, and German characters work\n');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    console.log('\n⚠️  If the error is about missing tables:');
    console.log('   Run the SQL from DATABASE_SETUP.md in Supabase first\n');
  }
}

runTests();
