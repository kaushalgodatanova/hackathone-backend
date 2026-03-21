import { Router } from 'express';

import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireDriver } from '../../middlewares/requireDriver';
import { DriverController } from '../controllers/driver.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireDriver);

router.get('/driver/runs', DriverController.listRuns);
router.get('/driver/runs/:runId', DriverController.getRun);

export default router;
