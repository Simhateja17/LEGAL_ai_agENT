/**
 * Test Database Query Module (Basic Functions)
 * 
 * Tests insertInsurer and insertDocument without chunks
 * Run this after creating the document_chunks table in Supabase
 */

import {
  insertInsurer,
  insertDocument,
  getInsurerByName,
  getAllInsurers,
  getDocumentsByInsurer,
} from './src/db/queries.js';

async function runBasicTests() {
  console.log('🧪 Testing Database Query Module (Basic Functions)\n');
  
  let testInsurerId, testInsurerName, testDocumentId, testDocumentTitle;
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Insert Insurer
  console.log('Test 1: Insert Insurer');
  totalTests++;
  try {
    const insurer = await insertInsurer({
      name: `Test Insurance ${Date.now()}`,
      description: 'Test insurance company',
      website: 'https://test.de',
      insurance_types: ['health', 'auto'],
      contact_email: 'test@insurance.de',
      contact_phone: '+49 123 456789',
    });
    
    console.log('✅ PASSED - Insurer created');
    console.log(`   ID: ${insurer.id}`);
    console.log(`   Name: ${insurer.name}\n`);
    passedTests++;
    
    testInsurerId = insurer.id;
    testInsurerName = insurer.name;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Test 2: Duplicate Insurer (should fail)
  console.log('Test 2: Duplicate Insurer (should fail)');
  totalTests++;
  try {
    await insertInsurer({
      name: testInsurerName,
      description: 'Duplicate',
    });
    console.log('❌ FAILED - Should have rejected duplicate\n');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ PASSED - Duplicate correctly rejected\n');
      passedTests++;
    } else {
      console.log(`❌ FAILED - Wrong error: ${error.message}\n`);
    }
  }

  // Test 3: Insert Document
  console.log('Test 3: Insert Document');
  totalTests++;
  try {
    const document = await insertDocument({
      insurer_id: testInsurerId,
      title: `Test Policy ${Date.now()}`,
      insurance_type: 'health',
      document_type: 'policy',
      source_url: 'https://test.de/policy.pdf',
      file_path: '/data/test.txt',
      language: 'de',
      metadata: { version: '1.0' },
    });
    
    console.log('✅ PASSED - Document created');
    console.log(`   ID: ${document.id}`);
    console.log(`   Title: ${document.title}\n`);
    passedTests++;
    
    testDocumentId = document.id;
    testDocumentTitle = document.title;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Test 4: Invalid Insurer ID (should fail)
  console.log('Test 4: Document with Invalid Insurer (should fail)');
  totalTests++;
  try {
    await insertDocument({
      insurer_id: '00000000-0000-0000-0000-000000000000',
      title: 'Invalid',
    });
    console.log('❌ FAILED - Should have rejected invalid insurer\n');
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('✅ PASSED - Invalid insurer correctly rejected\n');
      passedTests++;
    } else {
      console.log(`❌ FAILED - Wrong error: ${error.message}\n`);
    }
  }

  // Test 5: Duplicate Document (should fail)
  console.log('Test 5: Duplicate Document (should fail)');
  totalTests++;
  try {
    await insertDocument({
      insurer_id: testInsurerId,
      title: testDocumentTitle,
    });
    console.log('❌ FAILED - Should have rejected duplicate\n');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ PASSED - Duplicate correctly rejected\n');
      passedTests++;
    } else {
      console.log(`❌ FAILED - Wrong error: ${error.message}\n`);
    }
  }

  // Test 6: Get Insurer by Name
  console.log('Test 6: Get Insurer by Name');
  totalTests++;
  try {
    const insurer = await getInsurerByName(testInsurerName);
    if (insurer && insurer.id === testInsurerId) {
      console.log('✅ PASSED - Insurer retrieved\n');
      passedTests++;
    } else {
      console.log('❌ FAILED - Insurer not found\n');
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Test 7: Get All Insurers
  console.log('Test 7: Get All Insurers');
  totalTests++;
  try {
    const insurers = await getAllInsurers();
    if (Array.isArray(insurers) && insurers.length > 0) {
      console.log(`✅ PASSED - Retrieved ${insurers.length} insurers\n`);
      passedTests++;
    } else {
      console.log('❌ FAILED - No insurers found\n');
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Test 8: Get Documents by Insurer
  console.log('Test 8: Get Documents by Insurer');
  totalTests++;
  try {
    const documents = await getDocumentsByInsurer(testInsurerId);
    if (Array.isArray(documents) && documents.length > 0) {
      console.log(`✅ PASSED - Retrieved ${documents.length} documents\n`);
      passedTests++;
    } else {
      console.log('❌ FAILED - No documents found\n');
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');

  if (passedTests === totalTests) {
    console.log('✅ ALL BASIC TESTS PASSED!');
    console.log('📝 Next: Create document_chunks table and run full tests\n');
  }

  return passedTests === totalTests ? 0 : 1;
}

runBasicTests()
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
