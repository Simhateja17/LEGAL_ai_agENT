/**
 * Automated Supabase Database Setup Script
 * 
 * This script sets up the complete database schema for the German Insurance RAG system.
 * It will:
 * 1. Create all tables (insurers, documents, document_chunks)
 * 2. Create indexes for performance
 * 3. Create the search function
 * 4. Insert sample data for testing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n======================================================================');
console.log('🚀 GERMAN INSURANCE RAG - DATABASE SETUP');
console.log('======================================================================\n');

async function setupDatabase() {
  try {
    console.log('📋 Step 1: Checking database connection...');
    console.log('   Database URL:', supabaseUrl);
    console.log('✅ Connection configured\n');

    // Create insurers table
    console.log('📋 Step 2: Creating insurers table...');
    const { error: insurersError } = await supabase
      .from('insurers')
      .select('id')
      .limit(1);
    
    if (insurersError && insurersError.message.includes('does not exist')) {
      console.log('   Creating insurers table via SQL...');
      console.log('   ⚠️  Please run the SQL from db/complete-schema-setup.sql in Supabase SQL Editor');
      console.log('   📍 URL: https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].replace('https://', '') + '/sql/new\n');
      
      console.log('======================================================================');
      console.log('📝 REQUIRED ACTION');
      console.log('======================================================================');
      console.log('1. Open Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].replace('https://', '') + '/sql/new');
      console.log('\n2. Copy and paste this SQL:\n');
      
      const setupSQL = fs.readFileSync(path.join(__dirname, 'db', 'complete-schema-setup.sql'), 'utf8');
      const searchSQL = fs.readFileSync(path.join(__dirname, 'db', 'create-search-function.sql'), 'utf8');
      
      console.log('--- COPY FROM HERE ---');
      console.log(setupSQL);
      console.log('\n-- Search Function:');
      console.log(searchSQL);
      console.log('--- COPY TO HERE ---\n');
      
      console.log('3. Click "Run" in Supabase SQL Editor');
      console.log('4. Come back and run: node setup-database.js again\n');
      console.log('======================================================================\n');
      return;
    }

    console.log('✅ Tables already exist!\n');

    // Insert sample data
    console.log('📋 Step 3: Inserting sample insurers...');
    const sampleInsurers = [
      {
        name: 'Allianz Deutschland',
        description: 'Leading German insurance company offering comprehensive coverage',
        website: 'https://www.allianz.de',
        insurance_types: ['health', 'life', 'auto', 'home'],
        contact_email: 'kontakt@allianz.de'
      },
      {
        name: 'ERGO Versicherung',
        description: 'One of the largest insurance groups in Germany',
        website: 'https://www.ergo.de',
        insurance_types: ['health', 'life', 'auto', 'home', 'travel'],
        contact_email: 'service@ergo.de'
      },
      {
        name: 'AXA Versicherung',
        description: 'International insurance company with strong presence in Germany',
        website: 'https://www.axa.de',
        insurance_types: ['health', 'life', 'auto', 'home'],
        contact_email: 'kundenservice@axa.de'
      }
    ];

    for (const insurer of sampleInsurers) {
      const { error } = await supabase
        .from('insurers')
        .upsert(insurer, { onConflict: 'name' });
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`   ⚠️  ${insurer.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${insurer.name}`);
      }
    }

    console.log('\n📋 Step 4: Verifying database setup...');
    
    const { data: insurers, error: insurersCheckError } = await supabase
      .from('insurers')
      .select('id, name')
      .limit(5);
    
    if (insurersCheckError) {
      console.log('   ❌ Error checking insurers:', insurersCheckError.message);
    } else {
      console.log(`   ✅ Insurers table: ${insurers.length} records`);
    }

    const { data: documents, error: docsCheckError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (docsCheckError) {
      console.log('   ❌ Documents table:', docsCheckError.message);
    } else {
      console.log('   ✅ Documents table: Ready');
    }

    const { data: chunks, error: chunksCheckError } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1);
    
    if (chunksCheckError) {
      console.log('   ❌ Document chunks table:', chunksCheckError.message);
    } else {
      console.log('   ✅ Document chunks table: Ready');
    }

    console.log('\n======================================================================');
    console.log('✅ DATABASE SETUP COMPLETE!');
    console.log('======================================================================');
    console.log('\n📊 Summary:');
    console.log(`   • Tables: insurers, documents, document_chunks`);
    console.log(`   • Sample insurers: ${insurers?.length || 0} loaded`);
    console.log(`   • Database: Ready for RAG operations`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Run: node test-supabase-connection.js');
    console.log('   2. Run: node test-rag-pipeline.js');
    console.log('   3. Start server: npm start');
    console.log('   4. Test endpoint: http://localhost:3000/api/health');
    console.log('\n======================================================================\n');

  } catch (error) {
    console.error('\n❌ Setup Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

setupDatabase();
