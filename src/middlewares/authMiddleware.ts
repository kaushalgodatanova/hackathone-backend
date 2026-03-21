import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const { sub, email, role, name } = await verifyAccessToken(token);
    const id = Number(sub);
    if (!Number.isFinite(id)) {
      res.status(401).json({ message: 'Invalid token subject' });
      return;
    }
    req.user = { id, email, role, name };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
