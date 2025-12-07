// Timeout utility for LLM API calls to prevent hanging requests

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message
 * @returns {Promise} - Resolves with promise result or rejects on timeout
 */
export function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(errorMessage);
        error.name = 'TimeoutError';
        error.timeout = timeoutMs;
        reject(error);
      }, timeoutMs);
    })
  ]);
}

/**
 * Creates an AbortController that automatically aborts after a timeout
 * Useful for fetch requests with timeout support
 */
export function createTimeoutController(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return {
    controller,
    clearTimeout: () => clearTimeout(timeoutId)
  };
}
