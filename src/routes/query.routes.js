import express from 'express';
const router = express.Router();
import { searchQuery } from '../controllers/query.controller.js';
import { validateSearchQuery } from '../middleware/validation.js';

/**
 * GET /api/query/search?q=test&insurance_type=krankenversicherung
 * Search for documents using RAG
 */
router.get('/search', validateSearchQuery, searchQuery);

export default router;
