/**
 * RAG (Retrieval-Augmented Generation) Service
 * Orchestrates the complete RAG pipeline:
 * 1. Generate embedding for user query (1536 dimensions)
 * 2. Search for similar documents (vector search in Supabase 'documents' table)
 * 3. Build context and generate answer with LLM
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';
import * as embeddingService from './embedding.service.js';
import * as llmService from './llm.service.js';
import supabase from '../db/supabase.js';

// RAG Configuration
const RAG_CONFIG = {
  similarityThreshold: config.rag?.similarityThreshold || 0.3, // Threshold for legal search
  maxResults: config.rag?.maxResults || 10, // Results for context
  maxContextLength: config.rag?.maxContextLength || 6000,
  fallbackMode: config.rag?.fallbackMode !== false,
  embeddingDimension: 1536, // Match Azure text-embedding-3-small
  tableName: 'documents' // Supabase table with embeddings
};

// Mock document store for testing without database
// In production, this will be replaced with Supabase pgvector queries
// These are German law examples - the actual data comes from Supabase
const MOCK_DOCUMENTS = [
  // BÜRGERLICHES GESETZBUCH (BGB) - Civil Code
  {
    id: 1,
    content: '§ 433 BGB - Vertragstypische Pflichten beim Kaufvertrag. (1) Durch den Kaufvertrag wird der Verkäufer einer Sache verpflichtet, dem Käufer die Sache zu übergeben und das Eigentum an der Sache zu verschaffen. Der Verkäufer hat dem Käufer die Sache frei von Sach- und Rechtsmängeln zu verschaffen. (2) Der Käufer ist verpflichtet, dem Verkäufer den vereinbarten Kaufpreis zu zahlen und die gekaufte Sache abzunehmen.',
    law_code: 'BGB',
    paragraph_number: '§ 433',
    document_title: 'Kaufvertrag - Vertragstypische Pflichten',
    category: 'Schuldrecht',
    embedding: null
  },
  {
    id: 2,
    content: '§ 823 BGB - Schadensersatzpflicht. (1) Wer vorsätzlich oder fahrlässig das Leben, den Körper, die Gesundheit, die Freiheit, das Eigentum oder ein sonstiges Recht eines anderen widerrechtlich verletzt, ist dem anderen zum Ersatz des daraus entstehenden Schadens verpflichtet. (2) Die gleiche Verpflichtung trifft denjenigen, welcher gegen ein den Schutz eines anderen bezweckendes Gesetz verstößt.',
    law_code: 'BGB',
    paragraph_number: '§ 823',
    document_title: 'Schadensersatzpflicht - Deliktsrecht',
    category: 'Deliktsrecht',
    embedding: null
  },
  {
    id: 3,
    content: '§ 535 BGB - Inhalt und Hauptpflichten des Mietvertrags. (1) Durch den Mietvertrag wird der Vermieter verpflichtet, dem Mieter den Gebrauch der Mietsache während der Mietzeit zu gewähren. Der Vermieter hat die Mietsache dem Mieter in einem zum vertragsgemäßen Gebrauch geeigneten Zustand zu überlassen und sie während der Mietzeit in diesem Zustand zu erhalten. (2) Der Mieter ist verpflichtet, dem Vermieter die vereinbarte Miete zu entrichten.',
    law_code: 'BGB',
    paragraph_number: '§ 535',
    document_title: 'Mietvertrag - Hauptpflichten',
    category: 'Mietrecht',
    embedding: null
  },
  {
    id: 4,
    content: '§ 611 BGB - Vertragstypische Pflichten beim Dienstvertrag. (1) Durch den Dienstvertrag wird derjenige, welcher Dienste zusagt, zur Leistung der versprochenen Dienste, der andere Teil zur Gewährung der vereinbarten Vergütung verpflichtet. (2) Gegenstand des Dienstvertrags können Dienste jeder Art sein.',
    law_code: 'BGB',
    paragraph_number: '§ 611',
    document_title: 'Dienstvertrag - Arbeitsrecht Grundlage',
    category: 'Arbeitsrecht',
    embedding: null
  },
  {
    id: 5,
    content: '§ 1922 BGB - Gesamtrechtsnachfolge. (1) Mit dem Tode einer Person (Erbfall) geht deren Vermögen (Erbschaft) als Ganzes auf eine oder mehrere andere Personen (Erben) über. (2) Auf den Anteil eines Miterben (Erbteil) finden die sich auf die Erbschaft beziehenden Vorschriften Anwendung.',
    law_code: 'BGB',
    paragraph_number: '§ 1922',
    document_title: 'Erbrecht - Gesamtrechtsnachfolge',
    category: 'Erbrecht',
    embedding: null
  },
  // STRAFGESETZBUCH (StGB) - Criminal Code
  {
    id: 6,
    content: '§ 223 StGB - Körperverletzung. (1) Wer eine andere Person körperlich misshandelt oder an der Gesundheit schädigt, wird mit Freiheitsstrafe bis zu fünf Jahren oder mit Geldstrafe bestraft. (2) Der Versuch ist strafbar.',
    law_code: 'StGB',
    paragraph_number: '§ 223',
    document_title: 'Körperverletzung - Strafrecht',
    category: 'Strafrecht',
    embedding: null
  },
  {
    id: 7,
    content: '§ 242 StGB - Diebstahl. (1) Wer eine fremde bewegliche Sache einem anderen in der Absicht wegnimmt, die Sache sich oder einem Dritten rechtswidrig zuzueignen, wird mit Freiheitsstrafe bis zu fünf Jahren oder mit Geldstrafe bestraft. (2) Der Versuch ist strafbar.',
    law_code: 'StGB',
    paragraph_number: '§ 242',
    document_title: 'Diebstahl - Eigentumsdelikte',
    category: 'Strafrecht',
    embedding: null
  },
  // GRUNDGESETZ (GG) - Basic Law/Constitution
  {
    id: 8,
    content: 'Art. 1 GG - Menschenwürde, Grundrechtsbindung. (1) Die Würde des Menschen ist unantastbar. Sie zu achten und zu schützen ist Verpflichtung aller staatlichen Gewalt. (2) Das Deutsche Volk bekennt sich darum zu unverletzlichen und unveräußerlichen Menschenrechten als Grundlage jeder menschlichen Gemeinschaft, des Friedens und der Gerechtigkeit in der Welt.',
    law_code: 'GG',
    paragraph_number: 'Art. 1',
    document_title: 'Grundgesetz - Menschenwürde',
    category: 'Verfassungsrecht',
    embedding: null
  },
  {
    id: 9,
    content: 'Art. 3 GG - Gleichheit vor dem Gesetz. (1) Alle Menschen sind vor dem Gesetz gleich. (2) Männer und Frauen sind gleichberechtigt. Der Staat fördert die tatsächliche Durchsetzung der Gleichberechtigung von Frauen und Männern und wirkt auf die Beseitigung bestehender Nachteile hin. (3) Niemand darf wegen seines Geschlechtes, seiner Abstammung, seiner Rasse, seiner Sprache, seiner Heimat und Herkunft, seines Glaubens, seiner religiösen oder politischen Anschauungen benachteiligt oder bevorzugt werden.',
    law_code: 'GG',
    paragraph_number: 'Art. 3',
    document_title: 'Grundgesetz - Gleichheitsgrundsatz',
    category: 'Verfassungsrecht',
    embedding: null
  },
  // HANDELSGESETZBUCH (HGB) - Commercial Code
  {
    id: 10,
    content: '§ 1 HGB - Kaufmann. (1) Kaufmann im Sinne dieses Gesetzbuchs ist, wer ein Handelsgewerbe betreibt. (2) Handelsgewerbe ist jeder Gewerbebetrieb, es sei denn, dass das Unternehmen nach Art oder Umfang einen in kaufmännischer Weise eingerichteten Geschäftsbetrieb nicht erfordert.',
    law_code: 'HGB',
    paragraph_number: '§ 1',
    document_title: 'Handelsrecht - Kaufmann Definition',
    category: 'Handelsrecht',
    embedding: null
  },
  // ARBEITSRECHT
  {
    id: 11,
    content: '§ 1 KSchG - Kündigungsschutzgesetz. (1) Die Kündigung des Arbeitsverhältnisses gegenüber einem Arbeitnehmer, dessen Arbeitsverhältnis in demselben Betrieb oder Unternehmen ohne Unterbrechung länger als sechs Monate bestanden hat, ist rechtsunwirksam, wenn sie sozial ungerechtfertigt ist. (2) Sozial ungerechtfertigt ist die Kündigung, wenn sie nicht durch Gründe, die in der Person oder in dem Verhalten des Arbeitnehmers liegen, oder durch dringende betriebliche Erfordernisse bedingt ist.',
    law_code: 'KSchG',
    paragraph_number: '§ 1',
    document_title: 'Kündigungsschutz - Arbeitsrecht',
    category: 'Arbeitsrecht',
    embedding: null
  }
];

// Cache for mock document embeddings - reset on module load
let mockDocumentsInitialized = false;

// Reset embeddings on module load to ensure fresh embeddings
MOCK_DOCUMENTS.forEach(doc => doc.embedding = null);

/**
 * Initialize mock documents with embeddings
 */
async function initializeMockDocuments() {
  if (mockDocumentsInitialized) return;
  
  logger.info('Initializing mock documents with embeddings...');
  
  for (const doc of MOCK_DOCUMENTS) {
    try {
      doc.embedding = await embeddingService.generateEmbedding(doc.content);
    } catch (error) {
      logger.warn('Failed to generate embedding for mock document', { 
        docId: doc.id, 
        error: error.message 
      });
    }
  }
  
  mockDocumentsInitialized = true;
  logger.info('Mock documents initialized', { count: MOCK_DOCUMENTS.length });
}

/**
 * Search for similar documents using vector similarity
 * This is a mock implementation - replace with Supabase pgvector in production
 * 
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Similar documents with scores
 */
async function vectorSearch(queryEmbedding, options = {}) {
  const { 
    insuranceType, 
    insurerFilter, 
    threshold = RAG_CONFIG.similarityThreshold,
    maxResults = RAG_CONFIG.maxResults 
  } = options;

  // Initialize mock documents if needed
  await initializeMockDocuments();

  // Filter documents
  let candidates = MOCK_DOCUMENTS;
  
  if (insuranceType) {
    candidates = candidates.filter(doc => 
      (doc.insurance_type || doc.category || '').toLowerCase().includes(insuranceType.toLowerCase())
    );
  }
  
  if (insurerFilter) {
    candidates = candidates.filter(doc => 
      (doc.insurer_name || doc.law_code || '').toLowerCase().includes(insurerFilter.toLowerCase())
    );
  }

  // Calculate similarity scores - with error handling for dimension mismatch
  let results = [];
  for (const doc of candidates) {
    if (!doc.embedding) continue;
    try {
      const similarity = embeddingService.cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ ...doc, similarity });
    } catch (err) {
      // Skip documents with incompatible embeddings
      logger.debug('Skipping doc due to embedding mismatch', { docId: doc.id });
    }
  }
  
  results.sort((a, b) => b.similarity - a.similarity);

  // Log similarity scores for debugging
  logger.debug('Similarity scores', {
    scores: results.slice(0, 5).map(r => ({ 
      type: r.insurance_type, 
      insurer: r.insurer_name,
      similarity: r.similarity.toFixed(4) 
    }))
  });

  // Apply threshold but ensure we return at least some results for general queries
  const filteredResults = results.filter(doc => doc.similarity >= threshold);
  
  // If no results pass threshold but we have candidates, return top results anyway
  // This ensures general questions get some recommendations
  if (filteredResults.length === 0 && results.length > 0) {
    logger.info('No results above threshold, returning top matches for general query');
    results = results.slice(0, maxResults);
  } else {
    results = filteredResults.slice(0, maxResults);
  }

  logger.debug('Vector search completed', {
    candidatesCount: candidates.length,
    resultsCount: results.length,
    threshold,
    topScore: results[0]?.similarity
  });

  return results;
}

/**
 * Search for similar documents using Supabase pgvector
 * Queries the 'documents' table directly with 1536-dimension embeddings
 * 
 * @param {number[]} queryEmbedding - Query embedding vector (1536 dimensions)
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Similar documents
 */
async function supabaseVectorSearch(queryEmbedding, options = {}) {
  const {
    category,
    lawCode,
    threshold = RAG_CONFIG.similarityThreshold,
    maxResults = RAG_CONFIG.maxResults
  } = options;

  // Check if Supabase is connected
  if (!supabase) {
    logger.warn('Supabase not connected, using mock search');
    return vectorSearch(queryEmbedding, options);
  }

  try {
    // Convert embedding array to the format Supabase expects for vector (1536 dimensions)
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    logger.info('Searching documents table with vector similarity...', {
      embeddingLength: queryEmbedding.length,
      threshold,
      maxResults
    });
    
    // Try using the search_documents RPC function first
    const { data, error } = await supabase.rpc('search_documents', {
      query_embedding: embeddingString,
      match_threshold: threshold,
      match_count: maxResults
    });
    
    if (error) {
      logger.warn('RPC search_documents failed, trying match_documents', { error: error.message });
      
      // Try alternative RPC function name
      const { data: data2, error: error2 } = await supabase.rpc('match_documents', {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: maxResults
      });
      
      if (error2) {
        logger.warn('RPC match_documents also failed, using text search', { error: error2.message });
        return await textBasedSearch(options.originalQuery || '', maxResults);
      }
      
      if (data2 && data2.length > 0) {
        return transformResults(data2);
      }
    }

    if (!data || data.length === 0) {
      logger.info('No results from Supabase RPC search, trying text search');
      return await textBasedSearch(options.originalQuery || '', maxResults);
    }

    return transformResults(data);
  } catch (error) {
    logger.error('Supabase vector search failed', { error: error.message });
    // Fall back to text search
    logger.info('Using text search fallback');
    return await textBasedSearch(options.originalQuery || '', options.maxResults || 10);
  }
}

/**
 * Transform Supabase results to standard format
 */
function transformResults(data) {
  const results = data.map(doc => {
    let metadata = doc.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
    }
    
    return {
      id: doc.id,
      content: doc.content,
      law_code: metadata?.law_abbreviation || metadata?.law_code || metadata?.source || 'Deutsches Recht',
      paragraph_number: metadata?.section_identifier || metadata?.official_heading || metadata?.paragraph || '',
      document_title: metadata?.law_title || metadata?.title || '',
      category: metadata?.legal_type || metadata?.category || metadata?.mode || 'Recht',
      mode: metadata?.mode || 'professional',
      similarity: doc.similarity
    };
  });

  logger.info('Supabase vector search completed', {
    resultsCount: results.length,
    topScore: results[0]?.similarity?.toFixed(4)
  });

  return results;
}

/**
 * Direct vector search without RPC function
 * Uses raw SQL-like approach via Supabase client
 * @param {number[]} queryEmbedding - Query embedding
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Similar documents
 */
async function directVectorSearch(queryEmbedding, options = {}) {
  const { maxResults = 10 } = options;
  
  try {
    // Since we can't do direct vector operations via Supabase JS client,
    // we need to use text-based search as fallback
    logger.info('Using text-based search (RPC not available)');
    return await textBasedSearch(options.originalQuery || '', maxResults);
  } catch (error) {
    logger.error('Direct vector search failed', { error: error.message });
    return getMockResults(options.originalQuery || '', maxResults);
  }
}

/**
 * Get mock results based on query keywords - fast fallback
 */
function getMockResults(query, maxResults = 10) {
  const queryLower = query.toLowerCase();
  
  // Return relevant mock documents based on keywords
  let results = MOCK_DOCUMENTS.map((doc, index) => ({
    ...doc,
    similarity: 0.85 - (index * 0.05)
  }));
  
  // Filter by keyword match
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);
  if (keywords.length > 0) {
    results = results.filter(doc => {
      const content = (doc.content || '').toLowerCase();
      return keywords.some(kw => content.includes(kw));
    });
  }
  
  // If no keyword matches, return all
  if (results.length === 0) {
    results = MOCK_DOCUMENTS.map((doc, index) => ({
      ...doc,
      similarity: 0.7 - (index * 0.03)
    }));
  }
  
  return results.slice(0, maxResults);
}

/**
 * Text-based search fallback - searches content directly without embeddings
 * Uses Supabase ilike queries for text matching
 * @param {string} query - Search query text
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} Matching documents
 */
async function textBasedSearch(query, maxResults = 10) {
  if (!supabase || !query) {
    logger.warn('Text search fallback to mock data');
    return getMockResults(query, maxResults);
  }
  
  try {
    // German stop words to filter out
    const stopWords = ['was', 'ist', 'ein', 'eine', 'der', 'die', 'das', 'und', 'oder', 'für', 'mit', 
                       'bei', 'nach', 'auf', 'aus', 'von', 'wie', 'welche', 'welcher', 'welches',
                       'hat', 'haben', 'wird', 'werden', 'sind', 'kann', 'können', 'muss', 'müssen'];
    
    // Extract meaningful keywords from query (German law terms)
    const keywords = query.toLowerCase()
      .replace(/[§\?\!\"\'\.,:;]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    // Extract paragraph numbers (e.g., "433", "823")  
    const paragraphNumbers = query.match(/\d{1,4}/g) || [];
    
    // Build search term - prioritize legal terms and paragraph numbers
    let searchTerm = '';
    if (paragraphNumbers.length > 0) {
      searchTerm = paragraphNumbers[0];
    } else if (keywords.length > 0) {
      // Use the most specific legal keyword
      const legalKeywords = keywords.filter(k => 
        ['bgb', 'stgb', 'kaufvertrag', 'mietvertrag', 'schadensersatz', 'kündigung', 'vertrag', 
         'haftung', 'mieter', 'vermieter', 'käufer', 'verkäufer', 'arbeitnehmer', 'arbeitgeber',
         'erbe', 'testament', 'grundgesetz', 'verfassung', 'strafe', 'diebstahl', 'betrug',
         'versicherung', 'police', 'prämie', 'leistung', 'anspruch', 'pflicht', 'recht',
         'gesetz', 'paragraph', 'klausel', 'frist', 'mangel', 'gewährleistung'].includes(k)
      );
      searchTerm = legalKeywords[0] || keywords[0] || query.substring(0, 30);
    } else {
      searchTerm = query.substring(0, 30);
    }
    
    logger.info('Performing text-based search', { 
      keywords: keywords.slice(0, 5), 
      searchTerm,
      paragraphNumbers,
      maxResults 
    });
    
    // Try text search RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_german_laws_text', {
      search_query: searchTerm,
      result_limit: maxResults
    });
    
    if (!rpcError && rpcData && rpcData.length > 0) {
      logger.info('Text search RPC succeeded', { count: rpcData.length });
      return rpcData.map((doc, index) => {
        let metadata = doc.metadata;
        if (typeof metadata === 'string') {
          try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
        }
        return {
          id: doc.id,
          content: doc.content,
          law_code: metadata?.law_abbreviation || metadata?.source || 'Deutsches Recht',
          paragraph_number: metadata?.section_identifier || metadata?.paragraph || '',
          document_title: metadata?.law_title || metadata?.title || '',
          category: metadata?.legal_type || metadata?.category || metadata?.mode || 'Recht',
          mode: metadata?.mode || 'layman',
          similarity: doc.relevance || (0.9 - index * 0.05)
        };
      });
    }
    
    // Fallback: Direct ilike query on Supabase documents table
    if (rpcError) {
      logger.info('RPC failed, trying direct ilike search', { searchTerm });
      
      const { data: iLikeData, error: iLikeError } = await supabase
        .from('documents')
        .select('id, content, metadata')
        .ilike('content', `%${searchTerm}%`)
        .limit(maxResults);
      
      if (!iLikeError && iLikeData && iLikeData.length > 0) {
        logger.info('Direct ilike search succeeded', { count: iLikeData.length });
        return iLikeData.map((doc, index) => {
          let metadata = doc.metadata;
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
          }
          return {
            id: doc.id,
            content: doc.content,
            law_code: metadata?.law_abbreviation || metadata?.source || 'Deutsches Recht',
            paragraph_number: metadata?.section_identifier || metadata?.paragraph || '',
            document_title: metadata?.law_title || metadata?.title || '',
            category: metadata?.legal_type || metadata?.category || metadata?.mode || 'Recht',
            mode: metadata?.mode || 'layman',
            similarity: 0.85 - (index * 0.05)
          };
        });
      }
      
      logger.warn('Direct ilike search failed', { error: iLikeError?.message });
    }
    
    return getMockResults(query, maxResults);
    
  } catch (error) {
    logger.error('Text search exception', { error: error.message });
    return getMockResults(query, maxResults);
  }
}

/**
 * Prepare context from retrieved documents
 * Truncates context to fit within token limits
 * 
 * @param {Array} documents - Retrieved documents
 * @returns {Array} Prepared context chunks
 */
function prepareContext(documents) {
  if (!documents || documents.length === 0) {
    return [];
  }

  let totalLength = 0;
  const context = [];

  for (const doc of documents) {
    const content = doc.content || doc.text || '';
    
    if (totalLength + content.length > RAG_CONFIG.maxContextLength) {
      // Truncate remaining content
      const remaining = RAG_CONFIG.maxContextLength - totalLength;
      if (remaining > 100) {
        context.push({
          ...doc,
          content: content.substring(0, remaining) + '...'
        });
      }
      break;
    }

    context.push(doc);
    totalLength += content.length;
  }

  return context;
}

/**
 * Main RAG pipeline - Search documents and generate answer
 * 
 * @param {string} query - User's question
 * @param {string} insuranceType - Optional insurance type filter
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Answer with sources and metadata
 */
async function searchDocuments(query, insuranceType = null, options = {}) {
  const startTime = Date.now();
  
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }

  logger.info('Starting RAG pipeline', { query: query.substring(0, 100), insuranceType });

  try {
    // Step 1: Generate query embedding
    const embeddingStartTime = Date.now();
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const embeddingTime = Date.now() - embeddingStartTime;

    logger.debug('Query embedding generated', { durationMs: embeddingTime });

    // Step 2: Search for similar documents (use Supabase if available, fallback to mock)
    const searchStartTime = Date.now();
    const searchResults = supabase 
      ? await supabaseVectorSearch(queryEmbedding, {
          category: insuranceType,
          lawCode: options.lawCode,
          threshold: options.threshold,
          maxResults: options.maxResults,
          originalQuery: query  // Pass original query for text search fallback
        })
      : await vectorSearch(queryEmbedding, {
          insuranceType,
          insurerFilter: options.insurerFilter,
          threshold: options.threshold,
          maxResults: options.maxResults
        });
    const searchTime = Date.now() - searchStartTime;

    logger.debug('Vector search completed', { 
      durationMs: searchTime, 
      resultsCount: searchResults.length 
    });

    // Step 3: Prepare context
    const context = prepareContext(searchResults);

    // Step 4: Generate answer with LLM
    const llmStartTime = Date.now();
    const llmResult = await llmService.generateAnswer(query, context, {
      category: insuranceType,
      lawCode: options.lawCode
    });
    const llmTime = Date.now() - llmStartTime;

    const totalTime = Date.now() - startTime;

    // Prepare sources for response (updated for law content)
    const sources = searchResults.map(doc => ({
      insurer: doc.law_code || doc.insurer_name,
      law_code: doc.law_code,
      paragraph_number: doc.paragraph_number,
      type: doc.category || doc.insurance_type,
      title: doc.document_title,
      category: doc.category,
      similarity: Math.round(doc.similarity * 100) / 100,
      snippet: (doc.content || '').substring(0, 150) + '...'
    }));

    const result = {
      query,
      answer: llmResult.answer,
      sources,
      results: searchResults.map(doc => ({
        id: doc.id,
        content: doc.content,
        law_code: doc.law_code,
        paragraph_number: doc.paragraph_number,
        insurer_name: doc.law_code || doc.insurer_name,
        insurance_type: doc.category || doc.insurance_type,
        document_title: doc.document_title,
        category: doc.category,
        similarity: doc.similarity
      })),
      metadata: {
        totalTime,
        embeddingTime,
        searchTime,
        llmTime,
        resultsCount: searchResults.length,
        model: llmResult.metadata?.model,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('RAG pipeline completed', {
      query: query.substring(0, 50),
      resultsCount: searchResults.length,
      totalTime,
      embeddingTime,
      searchTime,
      llmTime
    });

    return result;
  } catch (error) {
    logger.error('RAG pipeline failed', {
      query: query.substring(0, 100),
      error: error.message
    });
    throw error;
  }
}

/**
 * Run the complete RAG pipeline (alias for searchDocuments)
 * @param {string} question - User's question
 * @param {Object} options - Pipeline options
 * @returns {Promise<Object>} Pipeline result
 */
async function runRagPipeline(question, options = {}) {
  return searchDocuments(question, options.insuranceType, options);
}

/**
 * Get RAG service information
 * @returns {Object} Service status and configuration
 */
function getRagServiceInfo() {
  return {
    config: RAG_CONFIG,
    embedding: embeddingService.getEmbeddingServiceInfo(),
    llm: llmService.getLLMServiceInfo(),
    mockDocumentsInitialized,
    mockDocumentsCount: MOCK_DOCUMENTS.length
  };
}

export {
  searchDocuments,
  runRagPipeline,
  vectorSearch,
  prepareContext,
  getRagServiceInfo,
  RAG_CONFIG
};

export default {
  searchDocuments,
  runRagPipeline,
  vectorSearch,
  prepareContext,
  getRagServiceInfo,
  RAG_CONFIG
};
