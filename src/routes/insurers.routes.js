import express from 'express';
const router = express.Router();
import { getAllInsurers } from '../controllers/insurers.controller.js';

/**
 * GET /api/insurers/
 * Get all insurers
 */
router.get('/', getAllInsurers);

export default router;
