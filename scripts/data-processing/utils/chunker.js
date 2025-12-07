/**
 * Document Chunking Utilities
 * 
 * Splits long documents into chunks suitable for embedding and retrieval.
 * Preserves sentence boundaries and maintains context with overlap.
 */

/**
 * Simple tokenizer for German text (approximates token count)
 * @param {string} text - Text to tokenize
 * @returns {number} Approximate token count
 */
export function estimateTokenCount(text) {
  if (!text) return 0;
  
  // Rough approximation: 1 token ≈ 4 characters for German text
  // More accurate would be to use tiktoken, but this is faster
  const chars = text.length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  
  // Average of character-based and word-based estimates
  const charBasedTokens = Math.ceil(chars / 4);
  const wordBasedTokens = Math.ceil(words * 1.3); // German words are often compound
  
  return Math.floor((charBasedTokens + wordBasedTokens) / 2);
}

/**
 * Split text into sentences (handles German punctuation)
 * @param {string} text - Text to split
 * @returns {Array<string>} Array of sentences
 */
export function splitIntoSentences(text) {
  if (!text) return [];
  
  // German-aware sentence splitting
  // Handles: Dr., z.B., u.a., etc., usw., bzw.
  const sentences = text
    // Protect abbreviations
    .replace(/Dr\./g, 'Dr<dot>')
    .replace(/z\.B\./g, 'z<dot>B<dot>')
    .replace(/u\.a\./g, 'u<dot>a<dot>')
    .replace(/etc\./g, 'etc<dot>')
    .replace(/usw\./g, 'usw<dot>')
    .replace(/bzw\./g, 'bzw<dot>')
    .replace(/inkl\./g, 'inkl<dot>')
    .replace(/ggf\./g, 'ggf<dot>')
    .replace(/evtl\./g, 'evtl<dot>')
    // Split on sentence endings
    .split(/[.!?]+\s+/)
    // Restore abbreviations
    .map(s => s
      .replace(/<dot>/g, '.')
      .trim()
    )
    .filter(s => s.length > 0);
  
  return sentences;
}

/**
 * Chunk text with target size and overlap
 * @param {string} text - Text to chunk
 * @param {Object} options - Chunking options
 * @returns {Array<Object>} Array of chunks with metadata
 */
export function chunkText(text, options = {}) {
  const {
    targetTokens = 800,      // Target chunk size in tokens
    overlapTokens = 75,      // Overlap between chunks
    minTokens = 100,         // Minimum chunk size
    maxTokens = 1000,        // Maximum chunk size
  } = options;
  
  if (!text) return [];
  
  const sentences = splitIntoSentences(text);
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;
  let overlapSentences = [];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokenCount(sentence);
    
    // Check if adding this sentence would exceed max tokens
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      // Save current chunk
      const chunkText = currentChunk.join(' ');
      chunks.push({
        text: chunkText,
        tokens: currentTokens,
        sentences: currentChunk.length,
        startSentence: i - currentChunk.length,
        endSentence: i - 1,
      });
      
      // Calculate overlap for next chunk
      let overlapTokenCount = 0;
      overlapSentences = [];
      
      // Take sentences from end of current chunk for overlap
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const overlapSentence = currentChunk[j];
        const overlapSentenceTokens = estimateTokenCount(overlapSentence);
        
        if (overlapTokenCount + overlapSentenceTokens <= overlapTokens) {
          overlapSentences.unshift(overlapSentence);
          overlapTokenCount += overlapSentenceTokens;
        } else {
          break;
        }
      }
      
      // Start new chunk with overlap
      currentChunk = [...overlapSentences, sentence];
      currentTokens = overlapTokenCount + sentenceTokens;
    } else {
      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }
    
    // If we've reached target size and have minimum content, prepare to chunk
    if (currentTokens >= targetTokens && currentChunk.length > 1) {
      const chunkText = currentChunk.join(' ');
      chunks.push({
        text: chunkText,
        tokens: currentTokens,
        sentences: currentChunk.length,
        startSentence: i - currentChunk.length + 1,
        endSentence: i,
      });
      
      // Calculate overlap
      let overlapTokenCount = 0;
      overlapSentences = [];
      
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const overlapSentence = currentChunk[j];
        const overlapSentenceTokens = estimateTokenCount(overlapSentence);
        
        if (overlapTokenCount + overlapSentenceTokens <= overlapTokens) {
          overlapSentences.unshift(overlapSentence);
          overlapTokenCount += overlapSentenceTokens;
        } else {
          break;
        }
      }
      
      // Reset for next chunk
      currentChunk = overlapSentences;
      currentTokens = overlapTokenCount;
    }
  }
  
  // Add final chunk if it meets minimum size
  if (currentChunk.length > 0 && currentTokens >= minTokens) {
    const chunkText = currentChunk.join(' ');
    chunks.push({
      text: chunkText,
      tokens: currentTokens,
      sentences: currentChunk.length,
      startSentence: sentences.length - currentChunk.length,
      endSentence: sentences.length - 1,
    });
  }
  
  // Add chunk indices
  return chunks.map((chunk, index) => ({
    ...chunk,
    index,
  }));
}

/**
 * Chunk document with metadata
 * @param {Object} document - Document object with text and metadata
 * @param {Object} options - Chunking options
 * @returns {Array<Object>} Array of chunks with document metadata
 */
export function chunkDocument(document, options = {}) {
  const {
    text,
    documentId,
    insurerId,
    title,
    insuranceType,
    documentType,
    sourceUrl,
  } = document;
  
  if (!text) {
    throw new Error('Document must have text property');
  }
  
  const chunks = chunkText(text, options);
  
  // Add document metadata to each chunk
  return chunks.map(chunk => ({
    documentId: documentId || null,
    insurerId: insurerId || null,
    chunkText: chunk.text,
    chunkIndex: chunk.index,
    tokenCount: chunk.tokens,
    metadata: {
      title: title || null,
      insuranceType: insuranceType || null,
      documentType: documentType || null,
      sourceUrl: sourceUrl || null,
      sentences: chunk.sentences,
      startSentence: chunk.startSentence,
      endSentence: chunk.endSentence,
    },
  }));
}

/**
 * Validate chunks quality
 * @param {Array<Object>} chunks - Array of chunks
 * @returns {Object} Validation result
 */
export function validateChunks(chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      valid: false,
      error: 'No chunks provided',
    };
  }
  
  const stats = {
    count: chunks.length,
    avgTokens: Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length),
    minTokens: Math.min(...chunks.map(c => c.tokenCount)),
    maxTokens: Math.max(...chunks.map(c => c.tokenCount)),
    totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
  };
  
  const warnings = [];
  
  // Check for issues
  if (stats.minTokens < 50) {
    warnings.push(`Some chunks are very short (min: ${stats.minTokens} tokens)`);
  }
  
  if (stats.maxTokens > 1500) {
    warnings.push(`Some chunks are very long (max: ${stats.maxTokens} tokens)`);
  }
  
  if (stats.avgTokens < 400 || stats.avgTokens > 1200) {
    warnings.push(`Average chunk size is outside optimal range: ${stats.avgTokens} tokens`);
  }
  
  // Check for empty chunks
  const emptyChunks = chunks.filter(c => !c.chunkText || c.chunkText.trim().length === 0);
  if (emptyChunks.length > 0) {
    warnings.push(`${emptyChunks.length} chunks have empty text`);
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
    stats,
  };
}

export default {
  estimateTokenCount,
  splitIntoSentences,
  chunkText,
  chunkDocument,
  validateChunks,
};
