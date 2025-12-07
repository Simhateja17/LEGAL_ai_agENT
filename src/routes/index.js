import { Router } from 'express';
import queryRoutes from './query.routes.js';
import insurersRoutes from './insurers.routes.js';

const router = Router();

router.use('/query', queryRoutes);
router.use('/insurers', insurersRoutes);

export default router;
