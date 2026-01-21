import NodeCache from 'node-cache';
import config from '../config/index.js';
import logger from './logger.js';

// Initialize cache
const cache = new NodeCache({
  stdTTL: config.cache.ttl,
  checkperiod: config.cache.checkPeriod,
  useClones: false,
  maxKeys: config.cache.maxKeys
});

// Cache statistics
let stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

// Get value from cache
const get = (key) => {
  if (!config.cache.enabled) return null;
  
  const value = cache.get(key);
  if (value !== undefined) {
    stats.hits++;
    logger.debug('Cache hit', { key });
    return value;
  }
  stats.misses++;
  logger.debug('Cache miss', { key });
  return null;
};

// Set value in cache
const set = (key, value, ttl = null) => {
  if (!config.cache.enabled) return false;
  
  const result = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
  if (result) {
    stats.sets++;
    logger.debug('Cache set', { key, ttl });
  }
  return result;
};

// Delete value from cache
const del = (key) => {
  const result = cache.del(key);
  if (result > 0) {
    stats.deletes++;
    logger.debug('Cache delete', { key });
  }
  return result;
};

// Clear all cache
const flush = () => {
  cache.flushAll();
  logger.info('Cache flushed');
};

// Get cache statistics
const getStats = () => {
  const cacheStats = cache.getStats();
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? (stats.hits / total) : 0;
  
  return {
    enabled: config.cache.enabled,
    hits: stats.hits,
    misses: stats.misses,
    sets: stats.sets,
    deletes: stats.deletes,
    hitRate: parseFloat((hitRate * 100).toFixed(2)),
    keys: cacheStats.keys,
    ksize: cacheStats.ksize,
    vsize: cacheStats.vsize
  };
};

// Reset statistics
const resetStats = () => {
  stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  logger.info('Cache stats reset');
};

export {
  get,
  set,
  del,
  flush,
  getStats,
  resetStats
};

export default {
  get,
  set,
  del,
  flush,
  getStats,
  resetStats
};
