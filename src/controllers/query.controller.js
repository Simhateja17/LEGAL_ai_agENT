import * as ragService from '../services/rag.service.js';
import cache from '../utils/cache.js';
import analytics from '../utils/analytics.js';
import logger from '../utils/logger.js';

/**
 * Handle search query request
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const searchQuery = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get query parameter 'q' from URL
    const { q, insurance_type } = req.query;

    // Create cache key
    const cacheKey = `search:${q}:${insurance_type || 'all'}`;
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info('Cache hit for search query', { query: q, insurance_type });
      
      return res.status(200).json({
        success: true,
        data: cachedResult,
        cached: true,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      });
    }

    // Call RAG service to search documents
    const queryStartTime = Date.now();
    const result = await ragService.searchDocuments(q, insurance_type);
    const queryLatency = Date.now() - queryStartTime;
    
    // Track query latency
    analytics.trackQueryLatency(queryLatency);
    
    // Cache the result
    cache.set(cacheKey, result);
    
    const processingTime = Date.now() - startTime;
    
    logger.info('Search query completed', { 
      query: q, 
      insurance_type,
      queryLatency,
      processingTime,
      resultsCount: result.results?.length || 0
    });

    // Format sources for frontend display (German labels)
    const formattedSources = result.sources?.map(s => ({
      gesetz: s.law_code || s.insurer || 'Deutsches Recht',
      paragraph: s.paragraph_number || s.type || '',
      titel: s.title,
      kategorie: formatLawType(s.category || s.type),
      relevanz: Math.round((s.similarity || 0) * 100) + '%',
      kurzinfo: s.snippet
    })) || [];

    // Return successful response with German-friendly structure
    res.status(200).json({
      success: true,
      data: {
        anfrage: q,
        antwort: result.answer,
        gesetzestexte: formattedSources,
        quellen: result.sources,
        ergebnisse: result.results,
        statistik: {
          gefundeneGesetze: result.results?.length || 0,
          verarbeitungszeit: `${processingTime}ms`
        }
      },
      cached: false,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime,
        queryLatency,
        version: '1.0.0'
      }
    });
  } catch (error) {
    // Handle errors gracefully - return a helpful response instead of crashing
    logger.logError(error, req, { query: req.query.q });
    analytics.trackError(error, `${req.method} ${req.path}`);
    
    const processingTime = Date.now() - startTime;
    
    // Return a graceful error response with a helpful message
    res.status(200).json({
      success: true,
      data: {
        anfrage: req.query.q,
        antwort: `Entschuldigung, bei der Suche ist ein technischer Fehler aufgetreten.\n\nMögliche Ursachen:\n• Die Datenbankverbindung ist unterbrochen\n• Die Suchfunktion ist noch nicht eingerichtet\n\nBitte versuchen Sie es später erneut oder kontaktieren Sie den Administrator.\n\nFehler: ${error.message}`,
        gesetzestexte: [],
        quellen: [],
        ergebnisse: [],
        statistik: {
          gefundeneGesetze: 0,
          verarbeitungszeit: `${processingTime}ms`
        }
      },
      cached: false,
      error: error.message,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime,
        version: '1.0.0'
      }
    });
  }
};

/**
 * Format law category to German display name
 */
function formatLawType(type) {
  const typeMap = {
    'bgb': 'Bürgerliches Gesetzbuch',
    'stgb': 'Strafgesetzbuch',
    'gg': 'Grundgesetz',
    'hgb': 'Handelsgesetzbuch',
    'kschg': 'Kündigungsschutzgesetz',
    'schuldrecht': 'Schuldrecht',
    'deliktsrecht': 'Deliktsrecht',
    'mietrecht': 'Mietrecht',
    'arbeitsrecht': 'Arbeitsrecht',
    'strafrecht': 'Strafrecht',
    'verfassungsrecht': 'Verfassungsrecht',
    'erbrecht': 'Erbrecht',
    'handelsrecht': 'Handelsrecht'
  };
  return typeMap[type?.toLowerCase()] || type || 'Deutsches Recht';
}
