/**
 * Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client for database operations.
 * Requires environment variables:
 * - SUPABASE_URL: Project URL from Supabase dashboard
 * - SUPABASE_KEY: Anon or service role key
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable. Please check your .env file.');
}

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_KEY environment variable. Please check your .env file.');
}

// Create Supabase client with configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Disable session persistence for backend
    autoRefreshToken: false, // Disable auto-refresh for backend
  },
  db: {
    schema: 'public', // Use public schema
  },
});

// Log connection status (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('✓ Supabase client initialized');
  console.log(`  URL: ${supabaseUrl.substring(0, 30)}...`);
}

export default supabase;
