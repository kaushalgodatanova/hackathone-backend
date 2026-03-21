import Fuse from 'fuse.js';

import { AppError } from '../../utils/AppError';
import type { ExtractedLine } from './nlOpenAi.service';
import { extractOrderLinesFromText } from './nlOpenAi.service';
import { RetailerService } from './retailer.service';

export type NlCatalogRow = Awaited<ReturnType<typeof RetailerService.getCatalogForNlMatching>>[number];

export type NlPreviewResolved = {
  status: 'resolved';
  lineKey: string;
  productHint: string;
  quantity: number;
  product: {
    id: number;
    productName: string;
    sku: string;
    price: number;
    stock: number;
    unavailable: boolean;
  };
};

export type NlPreviewAmbiguous = {
  status: 'ambiguous';
  lineKey: string;
  productHint: string;
  quantity: number;
  candidates: { id: number; productName: string; sku: string }[];
};

export type NlPreviewUnresolved = {
  status: 'unresolved';
  lineKey: string;
  productHint: string;
  quantity: number;
  reason: string;
};

export type NlPreviewLine = NlPreviewResolved | NlPreviewAmbiguous | NlPreviewUnresolved;

function mergeExtractedLines(
  lines: { productHint: string; quantity: number }[],
): { productHint: string; quantity: number }[] {
  const map = new Map<string, { displayHint: string; quantity: number }>();
  for (const l of lines) {
    const key = l.productHint.trim().toLowerCase();
    if (!key) continue;
    const prev = map.get(key);
    if (prev) prev.quantity += l.quantity;
    else map.set(key, { displayHint: l.productHint.trim(), quantity: l.quantity });
  }
  return [...map.values()].map(({ displayHint, quantity }) => ({
    productHint: displayHint,
    quantity,
  }));
}

function exactSkuMatch(hint: string, rows: NlCatalogRow[]): NlCatalogRow | null {
  const h = hint.trim();
  if (h.length < 2) return null;
  const lower = h.toLowerCase();
  for (const r of rows) {
    if (r.sku.toLowerCase() === lower) return r;
  }
  return null;
}

function matchHintToProduct(
  hint: string,
  rows: NlCatalogRow[],
): NlPreviewResolved | NlPreviewAmbiguous | NlPreviewUnresolved {
  const skuHit = exactSkuMatch(hint, rows);
  if (skuHit) {
    return {
      status: 'resolved',
      lineKey: '',
      productHint: hint,
      quantity: 0,
      product: {
        id: skuHit.id,
        productName: skuHit.productName,
        sku: skuHit.sku,
        price: skuHit.price,
        stock: skuHit.stock,
        unavailable: skuHit.unavailable,
      },
    };
  }

  const fuse = new Fuse(rows, {
    keys: [
      { name: 'productName', weight: 0.75 },
      { name: 'sku', weight: 0.25 },
    ],
    threshold: 0.52,
    ignoreLocation: true,
    minMatchCharLength: 1,
    includeScore: true,
  });

  const results = fuse.search(hint.trim(), { limit: 8 });
  if (results.length === 0) {
    return {
      status: 'unresolved',
      lineKey: '',
      productHint: hint,
      quantity: 0,
      reason: 'No close match in this distributor catalog',
    };
  }

  const s0 = results[0]!.score ?? 1;
  const s1 = results[1]?.score ?? 1;

  const GOOD = 0.48;
  const CLOSE_GAP = 0.14;

  if (s0 > GOOD) {
    return {
      status: 'unresolved',
      lineKey: '',
      productHint: hint,
      quantity: 0,
      reason: 'No confident match — try rephrasing the product name',
    };
  }

  const top = results[0]!.item;
  const second = results[1]?.item;

  if (second && s1 <= GOOD && s1 - s0 < CLOSE_GAP) {
    const cand = results
      .filter((r) => (r.score ?? 1) <= GOOD + 0.05)
      .slice(0, 4)
      .map((r) => ({
        id: r.item.id,
        productName: r.item.productName,
        sku: r.item.sku,
      }));
    if (cand.length >= 2) {
      return {
        status: 'ambiguous',
        lineKey: '',
        productHint: hint,
        quantity: 0,
        candidates: cand,
      };
    }
  }

  return {
    status: 'resolved',
    lineKey: '',
    productHint: hint,
    quantity: 0,
    product: {
      id: top.id,
      productName: top.productName,
      sku: top.sku,
      price: top.price,
      stock: top.stock,
      unavailable: top.unavailable,
    },
  };
}

/** Match extracted lines to catalog (used by NL preview and catalog chat). */
export async function previewFromExtractedLines(
  distributorId: number,
  extracted: ExtractedLine[],
): Promise<{ lines: NlPreviewLine[] }> {
  const catalog = await RetailerService.getCatalogForNlMatching(distributorId);
  if (catalog.length === 0) {
    return { lines: [] };
  }

  const merged = mergeExtractedLines(extracted);
  if (merged.length === 0) {
    return { lines: [] };
  }

  const lines: NlPreviewLine[] = merged.map((m, index) => {
    const lineKey = `nl-${index}`;
    const base = matchHintToProduct(m.productHint, catalog);
    if (base.status === 'resolved') {
      return {
        ...base,
        lineKey,
        quantity: m.quantity,
        productHint: m.productHint,
      };
    }
    if (base.status === 'ambiguous') {
      return {
        ...base,
        lineKey,
        quantity: m.quantity,
        productHint: m.productHint,
      };
    }
    return {
      ...base,
      lineKey,
      quantity: m.quantity,
      productHint: m.productHint,
    };
  });

  return { lines };
}

export async function previewNlCartOrder(distributorId: number, message: string): Promise<{ lines: NlPreviewLine[] }> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw AppError.badRequest('Message is required');
  }

  const extracted = await extractOrderLinesFromText(trimmed);
  return previewFromExtractedLines(distributorId, extracted);
}
