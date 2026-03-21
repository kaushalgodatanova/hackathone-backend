import type { Request, Response } from 'express';

import { catchAsync } from '../../utils/catchAsync';
import { DriverService } from '../services/driver.service';

function partnerId(req: Request): number {
  return req.user!.id;
}

export class DriverController {
  static listRuns = catchAsync(async (req: Request, res: Response) => {
    const data = await DriverService.listRuns(partnerId(req));
    res.json({ success: true as const, data });
  });

  static getRun = catchAsync(async (req: Request, res: Response) => {
    const runId = Number(req.params.runId);
    if (!Number.isFinite(runId)) {
      res.status(400).json({ message: 'Invalid run id' });
      return;
    }
    const data = await DriverService.getRunDetail(partnerId(req), runId);
    res.json({ success: true as const, data });
  });
}
