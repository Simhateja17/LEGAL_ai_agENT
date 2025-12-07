/**
 * Progress Tracking Utilities
 * 
 * Track and display progress for long-running data processing tasks.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Progress tracker class
 */
export class ProgressTracker {
  constructor(options = {}) {
    this.total = options.total || 0;
    this.current = 0;
    this.startTime = Date.now();
    this.label = options.label || 'Processing';
    this.logFile = options.logFile || null;
    this.updateInterval = options.updateInterval || 1000; // Update every second
    this.lastUpdate = 0;
    this.errors = [];
  }

  /**
   * Set total items to process
   */
  setTotal(total) {
    this.total = total;
  }

  /**
   * Increment progress
   */
  increment(count = 1) {
    this.current += count;
    this.maybeUpdate();
  }

  /**
   * Log an error
   */
  logError(error, context = {}) {
    this.errors.push({
      error: error.message || error,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update display if enough time has passed
   */
  maybeUpdate() {
    const now = Date.now();
    if (now - this.lastUpdate >= this.updateInterval) {
      this.display();
      this.lastUpdate = now;
    }
  }

  /**
   * Display progress
   */
  display() {
    const percent = this.total > 0 ? Math.round((this.current / this.total) * 100) : 0;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const rate = this.current / (elapsed || 1);
    const remaining = this.total > this.current ? Math.ceil((this.total - this.current) / rate) : 0;

    const bar = this.createBar(percent);
    const stats = this.formatStats(elapsed, remaining, rate);

    process.stdout.write(`\r${this.label}: ${bar} ${percent}% | ${this.current}/${this.total} | ${stats}`);
  }

  /**
   * Create progress bar
   */
  createBar(percent) {
    const width = 30;
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  /**
   * Format time and rate statistics
   */
  formatStats(elapsed, remaining, rate) {
    const formatTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    };

    return `Elapsed: ${formatTime(elapsed)} | Remaining: ${formatTime(remaining)} | Rate: ${rate.toFixed(1)}/s`;
  }

  /**
   * Complete progress tracking
   */
  async complete() {
    this.current = this.total;
    this.display();
    console.log('\n'); // New line after progress bar

    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    const summary = {
      total: this.total,
      completed: this.current,
      duration: duration,
      rate: (this.current / duration).toFixed(2),
      errors: this.errors.length,
    };

    console.log('Summary:');
    console.log(`  Total: ${summary.total}`);
    console.log(`  Completed: ${summary.completed}`);
    console.log(`  Duration: ${this.formatDuration(duration)}`);
    console.log(`  Rate: ${summary.rate} items/second`);
    
    if (this.errors.length > 0) {
      console.log(`  Errors: ${this.errors.length}`);
    }

    // Write log file if configured
    if (this.logFile) {
      await this.writeLog(summary);
    }

    return summary;
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  /**
   * Write progress log to file
   */
  async writeLog(summary) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      label: this.label,
      summary,
      errors: this.errors,
    };

    try {
      // Ensure log directory exists
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });

      // Append to log file
      await fs.appendFile(
        this.logFile,
        JSON.stringify(logEntry, null, 2) + '\n',
        'utf-8'
      );
    } catch (error) {
      console.error(`Failed to write log file: ${error.message}`);
    }
  }
}

/**
 * Create a simple progress tracker
 */
export function createTracker(total, label, logFile = null) {
  return new ProgressTracker({
    total,
    label,
    logFile,
  });
}

/**
 * Batch processing helper with progress tracking
 */
export async function processBatch(items, batchSize, processFn, label = 'Processing') {
  const tracker = new ProgressTracker({
    total: items.length,
    label,
  });

  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    try {
      const batchResults = await Promise.all(
        batch.map(item => processFn(item))
      );
      results.push(...batchResults);
      tracker.increment(batch.length);
    } catch (error) {
      tracker.logError(error, { batchStart: i, batchSize: batch.length });
      throw error;
    }
  }

  const summary = await tracker.complete();
  return { results, summary };
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, delay, error);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }

  throw lastError;
}

export default {
  ProgressTracker,
  createTracker,
  processBatch,
  retryWithBackoff,
};
