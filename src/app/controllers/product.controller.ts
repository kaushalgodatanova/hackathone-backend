import type { Request, Response } from 'express';

import { catchAsync } from '../../utils/catchAsync';
import { ProductService } from '../services/product.service';

function distributorId(req: Request): number {
  return req.user!.id;
}

function actorId(req: Request): number {
  return req.user!.id;
}

export class ProductController {
  static list = catchAsync(async (req: Request, res: Response) => {
    console.log('list', req.user, distributorId(req));
    const data = await ProductService.listForDistributor(distributorId(req));
    res.json({ success: true as const, data });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const row = await ProductService.getByIdForDistributor(id, distributorId(req));
    if (!row) {
      res.status(404).json({ success: false as const, message: 'Product not found' });
      return;
    }
    res.json({ success: true as const, data: row });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const data = await ProductService.create(distributorId(req), actorId(req), req.body);
    res.status(201).json({ success: true as const, data });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = await ProductService.update(id, distributorId(req), req.body);
    res.json({ success: true as const, data });
  });

  static remove = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await ProductService.deleteHard(id, distributorId(req));
    res.json({ success: true as const, message: 'Product deleted' });
  });

  static stockAdd = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = await ProductService.addStock(id, distributorId(req), actorId(req), req.body);
    res.json({ success: true as const, data });
  });

  static stockRemove = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = await ProductService.removeStock(id, distributorId(req), actorId(req), req.body);
    res.json({ success: true as const, data });
  });

  static stockSet = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = await ProductService.setStock(id, distributorId(req), actorId(req), req.body);
    res.json({ success: true as const, data });
  });

  static stockMovements = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const { rows, limit: lim, offset: off } = await ProductService.listMovements(id, distributorId(req), limit, offset);
    res.json({ success: true as const, data: rows, meta: { limit: lim, offset: off } });
  });
}
