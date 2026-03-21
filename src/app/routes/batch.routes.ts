import { Router } from 'express';

import { BatchController } from '../controllers/batch.controller';

const router = Router();

router.get('/batch/current', BatchController.current);

export default router;
