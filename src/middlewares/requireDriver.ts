import { NextFunction, Request, Response } from 'express';

export const requireDriver = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'delivery_partner') {
    res.status(403).json({ message: 'Delivery partner role required' });
    return;
  }
  next();
};
