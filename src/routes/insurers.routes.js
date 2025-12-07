import express from 'express';
import { getInsurers, getInsurerById } from '../controllers/insurers.controller.js';
import { validateInsurerId } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// GET /api/insurers - List all insurers
router.get('/', asyncHandler(getInsurers));

// GET /api/insurers/:id - Get specific insurer by ID
router.get('/:id', validateInsurerId, asyncHandler(getInsurerById));

export default router;
