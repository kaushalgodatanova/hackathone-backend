import type { Request, Response } from 'express';

import { catchAsync } from '../../utils/catchAsync';
import { DeliveryService } from '../services/delivery.service';

export class DeliveryController {
  static listSites = catchAsync(async (req: Request, res: Response) => {
    const retailOnly = String(req.query.retailOnly ?? 'true') !== 'false';
    const data = await DeliveryService.listSites({ retailDropsOnly: retailOnly });
    res.json({ success: true as const, data });
  });
}
