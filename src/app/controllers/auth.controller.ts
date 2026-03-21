import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static register = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);

    if ('error' in result) {
      if (result.error === 'email_taken') {
        res.status(409).json({ message: 'An account with this email already exists' });
        return;
      }
      res.status(500).json({ message: 'Registration failed' });
      return;
    }

    res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  });

  static login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);

    if ('error' in result) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  });

  static me = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const user = await AuthService.getProfile(req.user.id);
    res.json({ user });
  });

  static patchProfile = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const user = await AuthService.patchProfile(req.user.id, req.user.role, req.body);
    res.json({ user });
  });
}
