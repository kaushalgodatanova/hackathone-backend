import { AppError } from '../../utils/AppError';
import { catalogChatCompletion, type CatalogChatTurn } from './nlOpenAi.service';
import { previewFromExtractedLines, type NlCatalogRow, type NlPreviewLine } from './retailerNlCart.service';
import { RetailerService } from './retailer.service';

const MAX_CATALOG_CHARS = 120_000;
const MAX_TURNS = 24;

function formatCatalogBlock(rows: NlCatalogRow[]): string {
  const lines = rows.map((r) => {
    const avail = r.unavailable ? 'unavailable' : 'available';
    const cat = r.category ? ` | category: ${r.category}` : '';
    return `${r.productName} | SKU ${r.sku} | $${r.price.toFixed(2)} | stock ${r.stock} | ${avail}${cat}`;
  });
  let text = lines.join('\n');
  if (text.length > MAX_CATALOG_CHARS) {
    text = `${text.slice(0, MAX_CATALOG_CHARS)}\n...[catalog truncated for length]`;
  }
  return text;
}

export type CatalogChatResult = {
  reply: string;
  preview: { lines: NlPreviewLine[] } | null;
};

export async function retailerCatalogChat(
  distributorId: number,
  messages: CatalogChatTurn[],
): Promise<CatalogChatResult> {
  if (messages.length === 0) {
    throw AppError.badRequest('messages must not be empty');
  }

  const trimmed = messages.slice(-MAX_TURNS);
  const catalog = await RetailerService.getCatalogForNlMatching(distributorId);
  if (catalog.length === 0) {
    return {
      reply: 'This distributor has no products in the catalog yet.',
      preview: null,
    };
  }

  const catalogBlock = formatCatalogBlock(catalog);
  const { reply, orderLines } = await catalogChatCompletion(trimmed, catalogBlock);

  if (!orderLines.length) {
    return { reply, preview: null };
  }

  const preview = await previewFromExtractedLines(distributorId, orderLines);
  return { reply, preview: preview.lines.length > 0 ? preview : null };
}
