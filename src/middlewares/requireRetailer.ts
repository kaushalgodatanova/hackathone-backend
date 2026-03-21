import { NextFunction, Request, Response } from 'express';

/** Requires `authMiddleware` to run first. */
export function requireRetailer(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (req.user.role !== 'retailer') {
    res.status(403).json({ message: 'Retailer role required' });
    return;
  }
  next();
}
