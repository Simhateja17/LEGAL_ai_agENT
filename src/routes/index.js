import express from 'express';
const router = express.Router();

// Import route modules
import queryRoutes from './query.routes.js';
import insurersRoutes from './insurers.routes.js';
import statsRoutes from './stats.routes.js';

// Mount routes
router.use('/query', queryRoutes);
router.use('/insurers', insurersRoutes);
router.use('/stats', statsRoutes);

export default router;
