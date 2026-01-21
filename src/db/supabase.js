/**
 * Supabase Database Configuration
 * Handles connection to Supabase database with connection pooling
 */

import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

// Validate environment variables
if (!config.supabase.url || (!config.supabase.key && !config.supabase.serviceKey)) {
  console.warn('⚠️  Supabase credentials not configured. Database features will be limited.');
}

// Use service key for server-side operations (allows RPC calls and bypasses RLS)
const supabaseKey = config.supabase.serviceKey || config.supabase.key;

// Create Supabase client with connection pooling
const supabase = config.supabase.url && supabaseKey 
  ? createClient(
      config.supabase.url,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'german-legal-chatbot/1.0.0'
          }
        },
        // Connection pooling settings
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    )
  : null;

// Connection pool statistics
let poolStats = {
  totalQueries: 0,
  activeQueries: 0,
  failedQueries: 0,
  avgQueryTime: 0,
  queryTimes: []
};

// Wrap query execution to track statistics
const executeQuery = async (queryFn) => {
  const startTime = Date.now();
  poolStats.activeQueries++;
  poolStats.totalQueries++;
  
  try {
    const result = await queryFn();
    const queryTime = Date.now() - startTime;
    
    // Track query times
    poolStats.queryTimes.push(queryTime);
    if (poolStats.queryTimes.length > 100) {
      poolStats.queryTimes.shift();
    }
    
    // Update average
    poolStats.avgQueryTime = 
      poolStats.queryTimes.reduce((a, b) => a + b, 0) / poolStats.queryTimes.length;
    
    poolStats.activeQueries--;
    return result;
  } catch (error) {
    poolStats.failedQueries++;
    poolStats.activeQueries--;
    throw error;
  }
};

// Get pool statistics
const getPoolStats = () => {
  return {
    totalQueries: poolStats.totalQueries,
    activeQueries: poolStats.activeQueries,
    failedQueries: poolStats.failedQueries,
    avgQueryTime: Math.round(poolStats.avgQueryTime),
    successRate: poolStats.totalQueries > 0 
      ? ((poolStats.totalQueries - poolStats.failedQueries) / poolStats.totalQueries * 100).toFixed(2) + '%'
      : '100%'
  };
};

// Reset pool statistics
const resetPoolStats = () => {
  poolStats = {
    totalQueries: 0,
    activeQueries: 0,
    failedQueries: 0,
    avgQueryTime: 0,
    queryTimes: []
  };
};

export {
  supabase,
  executeQuery,
  getPoolStats,
  resetPoolStats
};

export default supabase;
