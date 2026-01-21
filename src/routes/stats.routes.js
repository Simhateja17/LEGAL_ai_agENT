import express from 'express';
const router = express.Router();
import { getStats, getHealth, getRagStatus, resetStats } from '../controllers/stats.controller.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

// GET /api/stats - Get API statistics
router.get('/', getStats);

// GET /api/stats/health - Get health status
router.get('/health', getHealth);

// GET /api/stats/rag - Get RAG system status
router.get('/rag', getRagStatus);

// POST /api/stats/reset - Reset statistics (use strict rate limiting)
router.post('/reset', strictLimiter, resetStats);

export default router;
