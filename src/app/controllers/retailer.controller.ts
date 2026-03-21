import type { Request, Response } from 'express';

import { catchAsync } from '../../utils/catchAsync';
import { retailerCatalogChat } from '../services/retailerCatalogChat.service';
import { previewNlCartOrder } from '../services/retailerNlCart.service';
import { RetailerService } from '../services/retailer.service';

function mergeNlApplyLines(
  lines: { productId: number; quantity: number }[],
): { productId: number; quantity: number }[] {
  const m = new Map<number, number>();
  for (const l of lines) {
    m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity);
  }
  return [...m.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function retailerId(req: Request): number {
  return req.user!.id;
}

export class RetailerController {
  static listDistributors = catchAsync(async (_req: Request, res: Response) => {
    const data = await RetailerService.listDistributors();
    res.json({ success: true as const, data });
  });

  static catalog = catchAsync(async (req: Request, res: Response) => {
    const distributorId = Number(req.query.distributorId);
    const data = await RetailerService.getCatalog(distributorId);
    res.json({ success: true as const, data });
  });

  static catalogChat = catchAsync(async (req: Request, res: Response) => {
    const { distributorId, messages } = req.body as {
      distributorId: number;
      messages: { role: 'user' | 'assistant'; content: string }[];
    };
    const data = await retailerCatalogChat(distributorId, messages);
    res.json({ success: true as const, data });
  });

  static getCart = catchAsync(async (req: Request, res: Response) => {
    const data = await RetailerService.getCart(retailerId(req));
    res.json({ success: true as const, data });
  });

  static upsertCartItem = catchAsync(async (req: Request, res: Response) => {
    const { productId, quantity } = req.body as { productId: number; quantity: number };
    await RetailerService.upsertCartItem(retailerId(req), productId, quantity);
    const data = await RetailerService.getCart(retailerId(req));
    res.json({ success: true as const, data });
  });

  static removeCartItem = catchAsync(async (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    await RetailerService.removeCartItem(retailerId(req), productId);
    const data = await RetailerService.getCart(retailerId(req));
    res.json({ success: true as const, data });
  });

  static clearCart = catchAsync(async (req: Request, res: Response) => {
    await RetailerService.clearCart(retailerId(req));
    const data = await RetailerService.getCart(retailerId(req));
    res.json({ success: true as const, data });
  });

  static checkout = catchAsync(async (req: Request, res: Response) => {
    const body = req.body as { deliverySiteId?: number };
    const data = await RetailerService.checkout(retailerId(req), {
      deliverySiteId: body.deliverySiteId,
    });
    res.status(201).json({ success: true as const, data });
  });

  static listOrders = catchAsync(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const result = await RetailerService.listOrders(retailerId(req), limit, offset);
    res.json({ success: true as const, ...result });
  });

  static nlCartPreview = catchAsync(async (req: Request, res: Response) => {
    const { distributorId, message } = req.body as { distributorId: number; message: string };
    const data = await previewNlCartOrder(distributorId, message);
    res.json({ success: true as const, data });
  });

  static nlCartApply = catchAsync(async (req: Request, res: Response) => {
    const { distributorId, lines } = req.body as {
      distributorId: number;
      lines: { productId: number; quantity: number }[];
    };
    const merged = mergeNlApplyLines(lines);
    await RetailerService.assertProductsBelongToDistributor(
      merged.map((l) => l.productId),
      distributorId,
    );
    await RetailerService.addLinesToCartMerge(retailerId(req), merged);
    const data = await RetailerService.getCart(retailerId(req));
    res.json({ success: true as const, data });
  });
}
