/**
 * Database Query Module
 * 
 * Provides functions for database operations including:
 * - insertInsurer: Add insurer records
 * - insertDocument: Add document records
 * - insertDocumentChunk: Add document chunk records
 * - bulkInsertChunks: Efficient batch insertion for chunks
 * - Comprehensive error handling for duplicates and connection errors
 */

import supabase from './supabase.js';

/**
 * Insert a new insurer record
 * 
 * @param {Object} insurerData - Insurer information
 * @param {string} insurerData.name - Insurer name (required)
 * @param {string} [insurerData.description] - Description
 * @param {string} [insurerData.website] - Website URL
 * @param {string[]} [insurerData.insurance_types] - Array of insurance types
 * @param {string} [insurerData.contact_email] - Contact email
 * @param {string} [insurerData.contact_phone] - Contact phone
 * @returns {Promise<Object>} - Inserted insurer record with id
 * @throws {Error} - On duplicate name or database errors
 */
export async function insertInsurer(insurerData) {
  try {
    // Validate required fields
    if (!insurerData.name) {
      throw new Error('Insurer name is required');
    }

    // Check for duplicate insurer name
    const { data: existing, error: checkError } = await supabase
      .from('insurers')
      .select('id, name')
      .eq('name', insurerData.name)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Database error checking for duplicate: ${checkError.message}`);
    }

    if (existing) {
      throw new Error(`Insurer with name "${insurerData.name}" already exists (ID: ${existing.id})`);
    }

    // Insert the insurer
    const { data, error } = await supabase
      .from('insurers')
      .insert([{
        name: insurerData.name,
        description: insurerData.description || null,
        website: insurerData.website || null,
        insurance_types: insurerData.insurance_types || [],
        contact_email: insurerData.contact_email || null,
        contact_phone: insurerData.contact_phone || null,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert insurer: ${error.message}`);
    }

    return data;
  } catch (error) {
    // Re-throw with context
    if (error.message.includes('already exists')) {
      throw error; // Preserve duplicate error message
    }
    throw new Error(`insertInsurer error: ${error.message}`);
  }
}

/**
 * Insert a new document record
 * 
 * @param {Object} documentData - Document information
 * @param {string} documentData.insurer_id - Insurer UUID (required)
 * @param {string} documentData.title - Document title (required)
 * @param {string} [documentData.insurance_type] - Insurance type
 * @param {string} [documentData.document_type] - Document type
 * @param {string} [documentData.source_url] - Source URL
 * @param {string} [documentData.file_path] - File path
 * @param {string} [documentData.language] - Language code (default: 'de')
 * @param {Object} [documentData.metadata] - Additional metadata
 * @returns {Promise<Object>} - Inserted document record with id
 * @throws {Error} - On invalid insurer_id or database errors
 */
export async function insertDocument(documentData) {
  try {
    // Validate required fields
    if (!documentData.insurer_id) {
      throw new Error('insurer_id is required');
    }
    if (!documentData.title) {
      throw new Error('Document title is required');
    }

    // Verify insurer exists
    const { data: insurer, error: insurerError } = await supabase
      .from('insurers')
      .select('id')
      .eq('id', documentData.insurer_id)
      .maybeSingle();

    if (insurerError) {
      throw new Error(`Database error checking insurer: ${insurerError.message}`);
    }

    if (!insurer) {
      throw new Error(`Insurer with ID "${documentData.insurer_id}" does not exist`);
    }

    // Check for duplicate document (same title and insurer)
    const { data: existing, error: checkError } = await supabase
      .from('documents')
      .select('id, title')
      .eq('insurer_id', documentData.insurer_id)
      .eq('title', documentData.title)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Database error checking for duplicate: ${checkError.message}`);
    }

    if (existing) {
      throw new Error(`Document with title "${documentData.title}" already exists for this insurer (ID: ${existing.id})`);
    }

    // Insert the document
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        insurer_id: documentData.insurer_id,
        title: documentData.title,
        insurance_type: documentData.insurance_type || null,
        document_type: documentData.document_type || null,
        source_url: documentData.source_url || null,
        file_path: documentData.file_path || null,
        language: documentData.language || 'de',
        metadata: documentData.metadata || {},
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert document: ${error.message}`);
    }

    return data;
  } catch (error) {
    // Re-throw with context
    if (error.message.includes('already exists') || error.message.includes('does not exist')) {
      throw error; // Preserve specific error messages
    }
    throw new Error(`insertDocument error: ${error.message}`);
  }
}

/**
 * Insert a single document chunk with embedding
 * 
 * @param {Object} chunkData - Chunk information
 * @param {string} chunkData.document_id - Document UUID (required)
 * @param {string} chunkData.insurer_id - Insurer UUID (required)
 * @param {string} chunkData.chunk_text - Chunk text content (required)
 * @param {number} chunkData.chunk_index - Position in document (required)
 * @param {number[]} chunkData.embedding - 768-dimensional vector (required)
 * @param {number} [chunkData.token_count] - Token count
 * @param {Object} [chunkData.metadata] - Additional metadata
 * @returns {Promise<Object>} - Inserted chunk record with id
 * @throws {Error} - On validation or database errors
 */
export async function insertDocumentChunk(chunkData) {
  try {
    // Validate required fields
    if (!chunkData.document_id) {
      throw new Error('document_id is required');
    }
    if (!chunkData.insurer_id) {
      throw new Error('insurer_id is required');
    }
    if (!chunkData.chunk_text) {
      throw new Error('chunk_text is required');
    }
    if (typeof chunkData.chunk_index !== 'number') {
      throw new Error('chunk_index is required and must be a number');
    }
    if (!chunkData.embedding || !Array.isArray(chunkData.embedding)) {
      throw new Error('embedding is required and must be an array');
    }
    if (chunkData.embedding.length !== 768) {
      throw new Error(`embedding must be 768-dimensional (got ${chunkData.embedding.length})`);
    }

    // Insert the chunk
    const { data, error } = await supabase
      .from('document_chunks')
      .insert([{
        document_id: chunkData.document_id,
        insurer_id: chunkData.insurer_id,
        chunk_text: chunkData.chunk_text,
        chunk_index: chunkData.chunk_index,
        embedding: chunkData.embedding,
        token_count: chunkData.token_count || null,
        metadata: chunkData.metadata || {},
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert chunk: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw new Error(`insertDocumentChunk error: ${error.message}`);
  }
}

/**
 * Bulk insert multiple document chunks efficiently
 * Uses batch insertion for better performance with large datasets
 * 
 * @param {Object[]} chunks - Array of chunk objects
 * @param {number} [batchSize=100] - Number of chunks per batch
 * @returns {Promise<Object>} - Summary with inserted count and any errors
 * @throws {Error} - On validation or critical database errors
 */
export async function bulkInsertChunks(chunks, batchSize = 100) {
  try {
    // Validate input
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('chunks must be a non-empty array');
    }

    const results = {
      total: chunks.length,
      inserted: 0,
      failed: 0,
      errors: [],
    };

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Validate batch data
      const validatedBatch = batch.map((chunk, index) => {
        const globalIndex = i + index;
        
        // Check required fields
        if (!chunk.document_id) {
          throw new Error(`Chunk at index ${globalIndex}: document_id is required`);
        }
        if (!chunk.insurer_id) {
          throw new Error(`Chunk at index ${globalIndex}: insurer_id is required`);
        }
        if (!chunk.chunk_text) {
          throw new Error(`Chunk at index ${globalIndex}: chunk_text is required`);
        }
        if (typeof chunk.chunk_index !== 'number') {
          throw new Error(`Chunk at index ${globalIndex}: chunk_index must be a number`);
        }
        if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
          throw new Error(`Chunk at index ${globalIndex}: embedding must be an array`);
        }
        if (chunk.embedding.length !== 768) {
          throw new Error(`Chunk at index ${globalIndex}: embedding must be 768-dimensional`);
        }

        return {
          document_id: chunk.document_id,
          insurer_id: chunk.insurer_id,
          chunk_text: chunk.chunk_text,
          chunk_index: chunk.chunk_index,
          embedding: chunk.embedding,
          token_count: chunk.token_count || null,
          metadata: chunk.metadata || {},
        };
      });

      try {
        // Insert batch
        const { data, error } = await supabase
          .from('document_chunks')
          .insert(validatedBatch)
          .select();

        if (error) {
          results.failed += batch.length;
          results.errors.push({
            batch: Math.floor(i / batchSize),
            range: `${i}-${i + batch.length - 1}`,
            error: error.message,
          });
        } else {
          results.inserted += data.length;
        }
      } catch (batchError) {
        results.failed += batch.length;
        results.errors.push({
          batch: Math.floor(i / batchSize),
          range: `${i}-${i + batch.length - 1}`,
          error: batchError.message,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`bulkInsertChunks error: ${error.message}`);
  }
}

/**
 * Get insurer by name
 * 
 * @param {string} name - Insurer name
 * @returns {Promise<Object|null>} - Insurer record or null if not found
 */
export async function getInsurerByName(name) {
  try {
    const { data, error } = await supabase
      .from('insurers')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get insurer: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw new Error(`getInsurerByName error: ${error.message}`);
  }
}

/**
 * Get all insurers
 * 
 * @returns {Promise<Object[]>} - Array of insurer records
 */
export async function getAllInsurers() {
  try {
    const { data, error } = await supabase
      .from('insurers')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to get insurers: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    throw new Error(`getAllInsurers error: ${error.message}`);
  }
}

/**
 * Get documents by insurer ID
 * 
 * @param {string} insurerId - Insurer UUID
 * @returns {Promise<Object[]>} - Array of document records
 */
export async function getDocumentsByInsurer(insurerId) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('insurer_id', insurerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get documents: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    throw new Error(`getDocumentsByInsurer error: ${error.message}`);
  }
}

/**
 * Get chunk count for a document
 * 
 * @param {string} documentId - Document UUID
 * @returns {Promise<number>} - Number of chunks
 */
export async function getChunkCount(documentId) {
  try {
    const { count, error } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Failed to get chunk count: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    throw new Error(`getChunkCount error: ${error.message}`);
  }
}

export default {
  insertInsurer,
  insertDocument,
  insertDocumentChunk,
  bulkInsertChunks,
  getInsurerByName,
  getAllInsurers,
  getDocumentsByInsurer,
  getChunkCount,
};
