import { Router } from 'express';

import { DeliveryController } from '../controllers/delivery.controller';

const router = Router();

router.get('/delivery-sites', DeliveryController.listSites);

export default router;
