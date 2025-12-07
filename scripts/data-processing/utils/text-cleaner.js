/**
 * Text Cleaning Utilities
 * 
 * Provides functions for cleaning and normalizing insurance document text.
 * Handles HTML removal, encoding fixes, German characters, and whitespace normalization.
 */

/**
 * Remove HTML tags and entities from text
 * @param {string} text - Text with HTML markup
 * @returns {string} Clean text without HTML
 */
export function removeHtml(text) {
  if (!text) return '';
  
  // Remove HTML tags
  let clean = text.replace(/<[^>]*>/g, ' ');
  
  // Decode common HTML entities
  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&auml;': 'ä',
    '&ouml;': 'ö',
    '&uuml;': 'ü',
    '&Auml;': 'Ä',
    '&Ouml;': 'Ö',
    '&Uuml;': 'Ü',
    '&szlig;': 'ß',
    '&euro;': '€',
  };
  
  for (const [entity, char] of Object.entries(entities)) {
    clean = clean.replace(new RegExp(entity, 'g'), char);
  }
  
  return clean;
}

/**
 * Fix encoding issues with German characters
 * @param {string} text - Text with potential encoding issues
 * @returns {string} Text with fixed encoding
 */
export function fixEncoding(text) {
  if (!text) return '';
  
  // Common encoding issues with German umlauts
  const fixes = {
    'Ã¤': 'ä',
    'Ã¶': 'ö',
    'Ã¼': 'ü',
    'Ã„': 'Ä',
    'Ã–': 'Ö',
    'Ãœ': 'Ü',
    'ÃŸ': 'ß',
  };
  
  let fixed = text;
  for (const [wrong, correct] of Object.entries(fixes)) {
    fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
  }
  
  return fixed;
}

/**
 * Normalize whitespace (collapse multiple spaces, normalize line breaks)
 * @param {string} text - Text with irregular whitespace
 * @returns {string} Text with normalized whitespace
 */
export function normalizeWhitespace(text) {
  if (!text) return '';
  
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive line breaks (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces
    .replace(/ {2,}/g, ' ')
    // Remove spaces at line ends
    .replace(/ +\n/g, '\n')
    // Remove spaces at line starts
    .replace(/\n +/g, '\n')
    // Trim
    .trim();
}

/**
 * Remove special characters but keep German letters and common punctuation
 * @param {string} text - Text with special characters
 * @returns {string} Cleaned text
 */
export function removeSpecialChars(text) {
  if (!text) return '';
  
  // Keep: letters (including German), numbers, spaces, common punctuation
  // Remove: control characters, rare symbols
  return text
    // Remove control characters except newlines
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Keep only allowed characters
    .replace(/[^\w\säöüÄÖÜßéèêáàâíìîóòôúùûñÑçÇ.,;:!?()\-–—"„"‚''€\/%\n]/g, ' ')
    // Clean up resulted multiple spaces
    .replace(/ {2,}/g, ' ');
}

/**
 * Clean insurance-specific formatting artifacts
 * @param {string} text - Insurance document text
 * @returns {string} Cleaned text
 */
export function cleanInsuranceFormatting(text) {
  if (!text) return '';
  
  return text
    // Remove page numbers (e.g., "Seite 12 von 45")
    .replace(/Seite\s+\d+\s+von\s+\d+/gi, '')
    // Remove footer/header patterns
    .replace(/\n[-–—]{3,}\n/g, '\n\n')
    // Remove repeated section markers
    .replace(/§\s*§/g, '§')
    // Normalize paragraph markers
    .replace(/¶/g, '§')
    // Remove table artifacts (| --- |)
    .replace(/\|[\s\-]+\|/g, ' ')
    // Clean bullet points
    .replace(/•\s*/g, '- ')
    .replace(/◦\s*/g, '  - ')
    .replace(/▪\s*/g, '- ');
}

/**
 * Complete text cleaning pipeline
 * @param {string} text - Raw text from document
 * @param {Object} options - Cleaning options
 * @returns {string} Clean, normalized text
 */
export function cleanText(text, options = {}) {
  if (!text) return '';
  
  const {
    removeHtmlTags = true,
    fixEncodingIssues = true,
    normalizeSpaces = true,
    removeSpecialCharacters = true,
    cleanInsuranceFormat = true,
  } = options;
  
  let clean = text;
  
  if (removeHtmlTags) {
    clean = removeHtml(clean);
  }
  
  if (fixEncodingIssues) {
    clean = fixEncoding(clean);
  }
  
  if (cleanInsuranceFormat) {
    clean = cleanInsuranceFormatting(clean);
  }
  
  if (removeSpecialCharacters) {
    clean = removeSpecialChars(clean);
  }
  
  if (normalizeSpaces) {
    clean = normalizeWhitespace(clean);
  }
  
  return clean;
}

/**
 * Validate cleaned text quality
 * @param {string} text - Cleaned text
 * @returns {Object} Validation result with warnings
 */
export function validateText(text) {
  const warnings = [];
  const stats = {
    length: text.length,
    lines: text.split('\n').length,
    words: text.split(/\s+/).filter(w => w.length > 0).length,
    hasGermanChars: /[äöüÄÖÜß]/.test(text),
  };
  
  // Check for issues
  if (text.length < 100) {
    warnings.push('Text is very short (< 100 characters)');
  }
  
  if (stats.words < 20) {
    warnings.push('Text has very few words (< 20)');
  }
  
  if (text.includes('�')) {
    warnings.push('Contains replacement character (encoding issue)');
  }
  
  if (/<[^>]+>/.test(text)) {
    warnings.push('Still contains HTML tags');
  }
  
  if (/\s{5,}/.test(text)) {
    warnings.push('Contains excessive whitespace');
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
    stats,
  };
}

export default {
  removeHtml,
  fixEncoding,
  normalizeWhitespace,
  removeSpecialChars,
  cleanInsuranceFormatting,
  cleanText,
  validateText,
};
