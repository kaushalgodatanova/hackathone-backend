"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewFromExtractedLines = previewFromExtractedLines;
exports.previewNlCartOrder = previewNlCartOrder;
const fuse_js_1 = __importDefault(require("fuse.js"));
const AppError_1 = require("../../utils/AppError");
const nlOpenAi_service_1 = require("./nlOpenAi.service");
const retailer_service_1 = require("./retailer.service");
function mergeExtractedLines(lines) {
    const map = new Map();
    for (const l of lines) {
        const key = l.productHint.trim().toLowerCase();
        if (!key)
            continue;
        const prev = map.get(key);
        if (prev)
            prev.quantity += l.quantity;
        else
            map.set(key, { displayHint: l.productHint.trim(), quantity: l.quantity });
    }
    return [...map.values()].map(({ displayHint, quantity }) => ({
        productHint: displayHint,
        quantity,
    }));
}
function exactSkuMatch(hint, rows) {
    const h = hint.trim();
    if (h.length < 2)
        return null;
    const lower = h.toLowerCase();
    for (const r of rows) {
        if (r.sku.toLowerCase() === lower)
            return r;
    }
    return null;
}
function matchHintToProduct(hint, rows) {
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
    const fuse = new fuse_js_1.default(rows, {
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
    const s0 = results[0].score ?? 1;
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
    const top = results[0].item;
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
async function previewFromExtractedLines(distributorId, extracted) {
    const catalog = await retailer_service_1.RetailerService.getCatalogForNlMatching(distributorId);
    if (catalog.length === 0) {
        return { lines: [] };
    }
    const merged = mergeExtractedLines(extracted);
    if (merged.length === 0) {
        return { lines: [] };
    }
    const lines = merged.map((m, index) => {
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
async function previewNlCartOrder(distributorId, message) {
    const trimmed = message.trim();
    if (!trimmed) {
        throw AppError_1.AppError.badRequest('Message is required');
    }
    const extracted = await (0, nlOpenAi_service_1.extractOrderLinesFromText)(trimmed);
    return previewFromExtractedLines(distributorId, extracted);
}
