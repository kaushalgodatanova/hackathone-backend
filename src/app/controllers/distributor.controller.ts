import type { Request, Response } from 'express';

import { catchAsync } from '../../utils/catchAsync';
import { RetailerService } from '../services/retailer.service';

function distributorId(req: Request): number {
  return req.user!.id;
}

export class DistributorController {
  static orderStats = catchAsync(async (req: Request, res: Response) => {
    const data = await RetailerService.getOrderStatsForDistributor(distributorId(req));
    res.json({ success: true as const, data });
  });

  static listOrders = catchAsync(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const result = await RetailerService.listOrdersForDistributor(distributorId(req), limit, offset);
    res.json({ success: true as const, ...result });
  });
}
