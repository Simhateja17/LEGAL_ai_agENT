import supabase from '../db/supabase.js';
import { withTimeout } from '../utils/timeout.js';

/**
 * RESTful API pattern for insurers resource
 * Demonstrates Controller → Database pattern
 */

// GET /api/insurers - List all insurers
export const getInsurers = async (req, res) => {
  const { type, limit = 50 } = req.query;
  
  // Query with timeout
  let query = supabase
    .from('insurers')
    .select('id, name, description, insurance_types, website')
    .limit(parseInt(limit));
  
  if (type) {
    query = query.contains('insurance_types', [type]);
  }
  
  const { data, error } = await withTimeout(
    query,
    5000,
    'Database query timed out'
  );
  
  if (error) {
    throw new Error(`Failed to fetch insurers: ${error.message}`);
  }
  
  // RESTful response
  res.json({
    success: true,
    data: data || [],
    metadata: {
      count: data?.length || 0,
      limit: parseInt(limit)
    }
  });
};

// GET /api/insurers/:id - Get specific insurer
export const getInsurerById = async (req, res) => {
  const { id } = req.params; // Already validated by middleware
  
  const { data, error } = await withTimeout(
    supabase
      .from('insurers')
      .select('*')
      .eq('id', id)
      .single(),
    5000,
    'Database query timed out'
  );
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return res.status(404).json({
        success: false,
        error: 'Insurer not found'
      });
    }
    throw new Error(`Failed to fetch insurer: ${error.message}`);
  }
  
  res.json({
    success: true,
    data
  });
};

export default { getInsurers, getInsurerById };
