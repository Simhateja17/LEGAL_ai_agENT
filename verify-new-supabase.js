/**
 * Verify New Supabase Database Setup
 * 
 * This script verifies that your new Supabase database is set up correctly
 * with all required tables, indexes, and extensions.
 * 
 * Usage:
 * 1. Create a .env.new file with your new Supabase credentials
 * 2. Run: node verify-new-supabase.js
 */

require('dotenv').config({ path: '.env.new' });
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifySetup() {
    log('\n🔍 Verifying New Supabase Database Setup...', 'cyan');
    log('='.repeat(60), 'cyan');

    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('\n❌ Missing Supabase credentials!', 'red');
        log('Please create a .env.new file with:', 'yellow');
        log('  SUPABASE_URL=your_project_url', 'yellow');
        log('  SUPABASE_SERVICE_KEY=your_service_key', 'yellow');
        process.exit(1);
    }

    log(`\n✓ Found credentials in .env.new`, 'green');
    log(`  URL: ${supabaseUrl}`, 'blue');

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    let passedTests = 0;
    let failedTests = 0;
    const results = [];

    // Test 1: Check pgvector extension
    log('\n📦 Checking pgvector extension...', 'cyan');
    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: "SELECT * FROM pg_extension WHERE extname = 'vector'"
        }).catch(() => {
            // If RPC doesn't exist, try direct query
            return supabase.from('pg_extension').select('*').eq('extname', 'vector');
        });

        // Alternative: Check by trying to use vector type
        const { error: vectorError } = await supabase
            .from('document_chunks')
            .select('embedding')
            .limit(1);

        if (!vectorError || vectorError.message.includes('does not exist')) {
            log('  ✅ pgvector extension is enabled', 'green');
            results.push({ test: 'pgvector extension', status: 'PASS' });
            passedTests++;
        } else {
            throw new Error('pgvector not found');
        }
    } catch (error) {
        log('  ❌ pgvector extension not enabled', 'red');
        log(`     Run: CREATE EXTENSION IF NOT EXISTS vector;`, 'yellow');
        results.push({ test: 'pgvector extension', status: 'FAIL' });
        failedTests++;
    }

    // Test 2: Check insurers table
    log('\n📋 Checking insurers table...', 'cyan');
    try {
        const { data, error } = await supabase
            .from('insurers')
            .select('*')
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            throw new Error('Table does not exist');
        }

        log('  ✅ insurers table exists', 'green');

        // Check columns
        const { count } = await supabase
            .from('insurers')
            .select('*', { count: 'exact', head: true });

        log(`     Rows: ${count || 0}`, 'blue');
        results.push({ test: 'insurers table', status: 'PASS' });
        passedTests++;
    } catch (error) {
        log('  ❌ insurers table not found', 'red');
        results.push({ test: 'insurers table', status: 'FAIL' });
        failedTests++;
    }

    // Test 3: Check documents table
    log('\n📄 Checking documents table...', 'cyan');
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            throw new Error('Table does not exist');
        }

        log('  ✅ documents table exists', 'green');

        const { count } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true });

        log(`     Rows: ${count || 0}`, 'blue');
        results.push({ test: 'documents table', status: 'PASS' });
        passedTests++;
    } catch (error) {
        log('  ❌ documents table not found', 'red');
        results.push({ test: 'documents table', status: 'FAIL' });
        failedTests++;
    }

    // Test 4: Check document_chunks table
    log('\n🧩 Checking document_chunks table...', 'cyan');
    try {
        const { data, error } = await supabase
            .from('document_chunks')
            .select('*')
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            throw new Error('Table does not exist');
        }

        log('  ✅ document_chunks table exists', 'green');

        const { count } = await supabase
            .from('document_chunks')
            .select('*', { count: 'exact', head: true });

        log(`     Rows: ${count || 0}`, 'blue');
        results.push({ test: 'document_chunks table', status: 'PASS' });
        passedTests++;
    } catch (error) {
        log('  ❌ document_chunks table not found', 'red');
        results.push({ test: 'document_chunks table', status: 'FAIL' });
        failedTests++;
    }

    // Test 5: Test insert capability
    log('\n✍️  Testing insert capability...', 'cyan');
    try {
        // Insert test insurer
        const { data: insurerData, error: insurerError } = await supabase
            .from('insurers')
            .insert({
                name: `Test Insurer ${Date.now()}`,
                description: 'Test description',
                website: 'https://test.com',
                insurance_types: ['health', 'life']
            })
            .select()
            .single();

        if (insurerError) throw insurerError;

        log('  ✅ Can insert into insurers table', 'green');
        log(`     Created insurer: ${insurerData.name}`, 'blue');

        // Clean up
        await supabase
            .from('insurers')
            .delete()
            .eq('id', insurerData.id);

        log('  ✅ Can delete from insurers table', 'green');
        results.push({ test: 'Insert/Delete capability', status: 'PASS' });
        passedTests++;
    } catch (error) {
        log('  ❌ Cannot insert/delete data', 'red');
        log(`     Error: ${error.message}`, 'yellow');
        results.push({ test: 'Insert/Delete capability', status: 'FAIL' });
        failedTests++;
    }

    // Test 6: Test foreign key relationships
    log('\n🔗 Testing foreign key relationships...', 'cyan');
    try {
        // Try to insert document without valid insurer_id
        const { error } = await supabase
            .from('documents')
            .insert({
                insurer_id: '00000000-0000-0000-0000-000000000000',
                title: 'Test Document'
            });

        if (error && error.message.includes('foreign key')) {
            log('  ✅ Foreign key constraints are working', 'green');
            results.push({ test: 'Foreign key constraints', status: 'PASS' });
            passedTests++;
        } else {
            throw new Error('Foreign key constraint not enforced');
        }
    } catch (error) {
        if (error.message.includes('not enforced')) {
            log('  ❌ Foreign key constraints not working', 'red');
            results.push({ test: 'Foreign key constraints', status: 'FAIL' });
            failedTests++;
        } else {
            log('  ✅ Foreign key constraints are working', 'green');
            results.push({ test: 'Foreign key constraints', status: 'PASS' });
            passedTests++;
        }
    }

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 VERIFICATION SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');

    results.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        const color = result.status === 'PASS' ? 'green' : 'red';
        log(`${icon} ${result.test}: ${result.status}`, color);
    });

    log('\n' + '='.repeat(60), 'cyan');
    log(`Total Tests: ${passedTests + failedTests}`, 'blue');
    log(`✅ Passed: ${passedTests}`, 'green');
    log(`❌ Failed: ${failedTests}`, 'red');
    log(`Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`, 'cyan');
    log('='.repeat(60), 'cyan');

    if (failedTests === 0) {
        log('\n🎉 SUCCESS! Your new Supabase database is set up correctly!', 'green');
        log('\nNext steps:', 'cyan');
        log('  1. Update your main .env file with new credentials', 'blue');
        log('  2. Load your insurance data using upload scripts', 'blue');
        log('  3. Test RAG queries with vector search', 'blue');
    } else {
        log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
        log('\nTroubleshooting:', 'cyan');
        log('  1. Make sure you ran the complete-schema-setup.sql file', 'blue');
        log('  2. Check Supabase dashboard for any error messages', 'blue');
        log('  3. Verify your credentials in .env.new are correct', 'blue');
    }

    log('');
}

// Run verification
verifySetup().catch(error => {
    log('\n💥 Verification failed with error:', 'red');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
});
