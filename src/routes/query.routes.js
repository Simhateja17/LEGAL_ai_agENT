import { Router } from 'express';
import { handleQuery } from '../controllers/query.controller.js';
import { validateQuery } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/query - Submit insurance question with validation
router.post('/', validateQuery, asyncHandler(handleQuery));

export default router;
