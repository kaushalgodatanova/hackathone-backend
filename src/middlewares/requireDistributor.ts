import { NextFunction, Request, Response } from 'express';

/** Requires `authMiddleware` to run first. */
export function requireDistributor(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (req.user.role !== 'distributor') {
    res.status(403).json({ message: 'Distributor role required' });
    return;
  }
  next();
}
