/**
 * LLM (Large Language Model) Service
 * Handles AI model interactions for text generation using Azure OpenAI
 * 
 * Supports GPT-4o-mini model
 * Includes fallback mode for testing without credentials
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';

// Azure OpenAI LLM Configuration
const LLM_CONFIG = {
  endpoint: config.azureOpenAI?.endpoint,
  apiKey: config.azureOpenAI?.apiKey,
  deployment: config.azureOpenAI?.llm?.deployment || 'gpt-4o-mini',
  apiVersion: config.azureOpenAI?.llm?.apiVersion || '2025-01-01-preview',
  temperature: config.azureOpenAI?.llm?.temperature || 0.7,
  maxTokens: config.azureOpenAI?.llm?.maxTokens || 2048,
  timeout: config.timeout?.external || 30000
};

// Track if we're in fallback mode
let useFallbackMode = !LLM_CONFIG.endpoint || !LLM_CONFIG.apiKey || config.rag?.fallbackMode;

/**
 * System prompt for German legal RAG assistant
 */
const SYSTEM_PROMPT = `Du bist ein hilfreicher Rechtsassistent für deutsches Recht.
Du antwortest auf Deutsch und hilfst Nutzern, relevante Gesetze und Paragraphen zu verstehen.

DEINE HAUPTAUFGABE:
- Verstehe die Rechtsfrage des Nutzers
- Finde und erkläre die relevanten Paragraphen und Gesetze
- Erkläre den Gesetzestext verständlich
- Gib praktische Anwendungsbeispiele

Wichtige Regeln:
1. Antworte basierend auf den bereitgestellten Gesetzestexten
2. Zitiere immer den genauen Paragraphen (z.B. § 433 BGB)
3. Erkläre juristische Fachbegriffe
4. Nenne verwandte Paragraphen wenn relevant
5. Bei komplexen Fragen: Verweise auf professionelle Rechtsberatung
6. Sei präzise, professionell und verständlich

ANTWORT-FORMAT:
📜 GESETZ: [Gesetzbuch und Paragraph]
📋 INHALT: [Kernaussage des Paragraphen]
💡 ERKLÄRUNG: [Verständliche Erklärung]
⚖️ ANWENDUNG: [Praktische Beispiele]

⚠️ HINWEIS: Dies ist eine allgemeine Rechtsinformation und keine Rechtsberatung.`;

/**
 * Build the prompt with context for RAG
 * @param {string} query - User's question
 * @param {Array} context - Retrieved document chunks
 * @param {Object} options - Additional options
 * @returns {string} Formatted prompt
 */
function buildPrompt(query, context = [], options = {}) {
  const { lawCode, category } = options;
  
  // Format context documents
  let contextSection = '';
  
  if (context && context.length > 0) {
    contextSection = context.map((chunk, index) => {
      const lawSource = chunk.law_code || chunk.insurer_name || 'Deutsches Recht';
      const paragraph = chunk.paragraph_number || '';
      const docTitle = chunk.document_title || chunk.title || '';
      const categoryLabel = chunk.category || '';
      
      return `
--- Gesetzestext ${index + 1} ---
Quelle: ${lawSource} ${paragraph}${docTitle ? ` - ${docTitle}` : ''}${categoryLabel ? ` (${categoryLabel})` : ''}
Inhalt:
${chunk.content || chunk.text || chunk}
---`;
    }).join('\n');
  } else {
    contextSection = '[Keine relevanten Gesetzestexte gefunden]';
  }

  // Build filter information
  let filterInfo = '';
  if (lawCode) {
    filterInfo += `\nGesetzbuch: ${lawCode}`;
  }
  if (category) {
    filterInfo += `\nRechtsgebiet: ${category}`;
  }

  const prompt = `${SYSTEM_PROMPT}

=== KONTEXT AUS GESETZESTEXTEN ===
${contextSection}
${filterInfo}
=== ENDE KONTEXT ===

Rechtsfrage: ${query}

Bitte beantworte die Frage basierend auf den obigen Gesetzestexten. Erkläre den rechtlichen Hintergrund verständlich.

Antwort:`;

  return prompt;
}

/**
 * Generate a fallback response for testing
 * Provides intelligent legal information based on context - ALL IN GERMAN
 * @param {string} query - User query
 * @param {Array} context - Retrieved context
 * @returns {string} Fallback response
 */
function generateFallbackResponse(query, context = []) {
  const hasContext = context && context.length > 0;
  const queryLower = query.toLowerCase();
  
  if (!hasContext) {
    // Check for specific paragraph queries and provide smart responses
    const paragraphMatch = query.match(/§\s*(\d+)/i) || query.match(/(\d+)\s*bgb/i) || query.match(/(\d+)\s*stgb/i);
    const articleMatch = query.match(/art\.?\s*(\d+)/i) || query.match(/artikel\s*(\d+)/i);
    
    if (paragraphMatch || articleMatch) {
      return `Ich suche nach dem angefragten Paragraphen in der Datenbank.

Die Suche wird mit den verfügbaren Gesetzestexten durchgeführt.

⚖️ Hinweis: Für eine verbindliche Rechtsauskunft wenden Sie sich bitte an einen Rechtsanwalt.`;
    }
    
    return `📚 DEUTSCHE RECHTSAUSKUNFT

Ich helfe Ihnen gerne bei Fragen zum deutschen Recht. Sie können mich fragen:

• Nach einem bestimmten Paragraphen (z.B. "§ 433 BGB")
• Nach einem Rechtsgebiet (z.B. "Mietrecht", "Arbeitsrecht")
• Nach einem Rechtsbegriff (z.B. "Schadensersatz", "Kündigung")

Verfügbare Gesetze:
📕 BGB - Bürgerliches Gesetzbuch
📗 StGB - Strafgesetzbuch
📘 GG - Grundgesetz
📙 HGB - Handelsgesetzbuch
📒 KSchG - Kündigungsschutzgesetz

⚖️ Hinweis: Dies ist eine allgemeine Rechtsinformation, keine Rechtsberatung.`;
  }

  // Analyze context to provide legal information
  const sources = context.map(c => ({
    lawCode: c.law_code || c.insurer_name || 'Deutsches Recht',
    paragraph: c.paragraph_number || '',
    category: c.category || '',
    title: c.document_title || '',
    content: c.content || c.text || '',
    similarity: c.similarity || 0
  }));

  // Find the best match (highest similarity)
  const bestMatch = sources.reduce((best, current) => 
    (current.similarity > (best?.similarity || 0)) ? current : best
  , sources[0]);

  // Format law category nicely
  const formatCategory = (cat) => {
    const catMap = {
      'schuldrecht': 'Schuldrecht',
      'deliktsrecht': 'Deliktsrecht',
      'mietrecht': 'Mietrecht',
      'arbeitsrecht': 'Arbeitsrecht',
      'strafrecht': 'Strafrecht',
      'verfassungsrecht': 'Verfassungsrecht',
      'erbrecht': 'Erbrecht',
      'handelsrecht': 'Handelsrecht'
    };
    return catMap[cat?.toLowerCase()] || cat || '';
  };
  
  // Build legal response in German
  let response = `📜 RECHTSAUSKUNFT\n\n`;
  
  response += `## ${bestMatch.paragraph} ${bestMatch.lawCode}`;
  if (bestMatch.title) {
    response += ` - ${bestMatch.title}`;
  }
  response += `\n\n`;
  
  if (bestMatch.category) {
    response += `**Rechtsgebiet:** ${formatCategory(bestMatch.category)}\n\n`;
  }
  
  response += `### Gesetzestext\n`;
  response += `${bestMatch.content}\n\n`;

  // Add explanation section in German
  response += `### Erklärung\n`;
  let explanationDE = `Dieser Paragraph regelt `;
  let explanationEN = `This section regulates `;
  if (bestMatch.content.includes('verpflichtet')) {
    explanationDE += `die Pflichten und Verpflichtungen der beteiligten Parteien. `;
    explanationEN += `the duties and obligations of the parties involved. `;
  }
  if (bestMatch.content.includes('Schaden')) {
    explanationDE += `die Haftung und den Ersatz von Schäden. `;
    explanationEN += `liability and compensation for damages. `;
  }
  if (bestMatch.content.includes('Strafe') || bestMatch.content.includes('Freiheitsstrafe')) {
    explanationDE += `die strafrechtlichen Konsequenzen. `;
    explanationEN += `the criminal law consequences. `;
  }
  response += explanationDE + `\n\n`;

  // Show ALL related sections with FULL CONTENT
  if (sources.length > 1) {
    response += `### Weitere relevante Paragraphen\n\n`;
    sources.slice(1, 5).forEach((s, index) => {
      response += `---\n\n`;
      response += `#### ${index + 2}. ${s.paragraph} ${s.lawCode}`;
      if (s.title) response += ` - ${s.title}`;
      response += `\n\n`;
      if (s.category) {
        response += `**Rechtsgebiet:** ${formatCategory(s.category)}\n\n`;
      }
      response += `**Gesetzestext:**\n${s.content}\n\n`;
    });
  }

  response += `---\n`;
  response += `⚖️ _Dies ist eine allgemeine Rechtsinformation und keine Rechtsberatung. Für rechtsverbindliche Auskünfte wenden Sie sich bitte an einen Rechtsanwalt._`;

  return response;
}

/**
 * Call Vertex AI LLM to generate a response
 * @param {string} prompt - The formatted prompt
 * @param {Object} options - Generation options
 * @returns {Promise<string>} Generated response
 */
async function callLLMInternal(prompt, options = {}) {
  if (useFallbackMode) {
    logger.debug('Using fallback LLM response');
    return null; // Signal to use fallback
  }

  try {
    // Azure OpenAI Chat Completions endpoint
    const endpoint = `${LLM_CONFIG.endpoint}openai/deployments/${LLM_CONFIG.deployment}/chat/completions?api-version=${LLM_CONFIG.apiVersion}`;
    
    logger.debug('Calling Azure OpenAI LLM API', { 
      deployment: LLM_CONFIG.deployment 
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_CONFIG.timeout);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': LLM_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: LLM_CONFIG.temperature,
        max_tokens: LLM_CONFIG.maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    throw new Error('Unexpected response format from Azure OpenAI');
  } catch (error) {
    logger.error('LLM call failed', {
      error: error.message,
      deployment: LLM_CONFIG.deployment
    });

    // Check for specific error types
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      throw new Error('Authentication error with Azure OpenAI.');
    }
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new Error('LLM request timed out. Please try again.');
    }

    throw error;
  }
}

/**
 * Generate an answer using the LLM with context (main RAG function)
 * @param {string} query - User's question
 * @param {Array} context - Retrieved document chunks
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Response with answer and metadata
 */
async function generateAnswer(query, context = [], options = {}) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const startTime = Date.now();
  
  try {
    const prompt = buildPrompt(query, context, options);
    
    logger.debug('Generating LLM answer', {
      queryLength: query.length,
      contextChunks: context.length,
      mode: useFallbackMode ? 'fallback' : 'azure-openai'
    });

    let answer;
    
    if (useFallbackMode) {
      answer = generateFallbackResponse(query, context);
    } else {
      const llmResponse = await callLLMInternal(prompt, options);
      answer = llmResponse || generateFallbackResponse(query, context);
    }

    const durationMs = Date.now() - startTime;

    logger.info('LLM answer generated', {
      queryLength: query.length,
      answerLength: answer.length,
      durationMs,
      mode: useFallbackMode ? 'fallback' : 'vertex-ai'
    });

    return {
      answer,
      metadata: {
        model: useFallbackMode ? 'fallback' : LLM_CONFIG.model,
        contextChunks: context.length,
        durationMs,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Failed to generate answer', {
      query: query.substring(0, 100),
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate response using LLM (legacy function)
 * @param {string} prompt - The prompt to send to LLM
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Generated response
 */
async function generateResponse(prompt, options = {}) {
  const response = await callLLMInternal(prompt, options);
  return response || `[Fallback Response] Unable to generate response for: ${prompt.substring(0, 100)}...`;
}

/**
 * Generate response with context (legacy function for backward compatibility)
 * @param {string} query - User query
 * @param {Array<string>} context - Retrieved context documents
 * @returns {Promise<string>} Generated response
 */
async function generateContextualResponse(query, context) {
  const result = await generateAnswer(query, context.map(c => ({ content: c })));
  return result.answer;
}

/**
 * Get LLM service information
 * @returns {Object} Service configuration and status
 */
function getLLMServiceInfo() {
  return {
    provider: useFallbackMode ? 'fallback' : 'azure-openai',
    deployment: LLM_CONFIG.deployment,
    temperature: LLM_CONFIG.temperature,
    maxTokens: LLM_CONFIG.maxTokens,
    endpoint: LLM_CONFIG.endpoint ? LLM_CONFIG.endpoint.substring(0, 30) + '...' : 'not-configured',
    apiVersion: LLM_CONFIG.apiVersion,
    fallbackMode: useFallbackMode
  };
}

// Legacy alias
const callLLM = generateResponse;

export {
  generateAnswer,
  generateResponse,
  generateContextualResponse,
  buildPrompt,
  callLLM,
  getLLMServiceInfo,
  LLM_CONFIG
};

export default {
  generateAnswer,
  generateResponse,
  generateContextualResponse,
  buildPrompt,
  callLLM,
  getLLMServiceInfo,
  LLM_CONFIG
};
