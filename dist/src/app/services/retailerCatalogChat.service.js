"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retailerCatalogChat = retailerCatalogChat;
const AppError_1 = require("../../utils/AppError");
const nlOpenAi_service_1 = require("./nlOpenAi.service");
const retailerNlCart_service_1 = require("./retailerNlCart.service");
const retailer_service_1 = require("./retailer.service");
const MAX_CATALOG_CHARS = 120000;
const MAX_TURNS = 24;
function formatCatalogBlock(rows) {
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
async function retailerCatalogChat(distributorId, messages) {
    if (messages.length === 0) {
        throw AppError_1.AppError.badRequest('messages must not be empty');
    }
    const trimmed = messages.slice(-MAX_TURNS);
    const catalog = await retailer_service_1.RetailerService.getCatalogForNlMatching(distributorId);
    if (catalog.length === 0) {
        return {
            reply: 'This distributor has no products in the catalog yet.',
            preview: null,
        };
    }
    const catalogBlock = formatCatalogBlock(catalog);
    const { reply, orderLines } = await (0, nlOpenAi_service_1.catalogChatCompletion)(trimmed, catalogBlock);
    if (!orderLines.length) {
        return { reply, preview: null };
    }
    const preview = await (0, retailerNlCart_service_1.previewFromExtractedLines)(distributorId, orderLines);
    return { reply, preview: preview.lines.length > 0 ? preview : null };
}
