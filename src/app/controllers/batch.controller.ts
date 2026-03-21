import type { Request, Response } from 'express';

import { catchAsync } from '../../utils/catchAsync';
import { BatchService } from '../services/batch.service';

export class BatchController {
  static current = catchAsync(async (_req: Request, res: Response) => {
    const data = await BatchService.getCurrentBatchPublic();
    res.json({ success: true as const, data });
  });
}
