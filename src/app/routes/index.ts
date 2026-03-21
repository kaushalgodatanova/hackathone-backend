import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { openApiDocument } from '../../docs/openapi';
import authRoutes from './auth.routes';
import batchRoutes from './batch.routes';
import deliveryRoutes from './delivery.routes';
import distributorRoutes from './distributor.routes';
import driverRoutes from './driver.routes';
import productRoutes from './product.routes';
import retailerRoutes from './retailer.routes';

const router = Router();

router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

router.use(authRoutes);
router.use(deliveryRoutes);
router.use(batchRoutes);
router.use('/products', productRoutes);
router.use('/retailer', retailerRoutes);
router.use('/distributor', distributorRoutes);
router.use(driverRoutes);

export default router;
