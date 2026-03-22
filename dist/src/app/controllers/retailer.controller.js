"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetailerController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const retailerCatalogChat_service_1 = require("../services/retailerCatalogChat.service");
const retailerNlCart_service_1 = require("../services/retailerNlCart.service");
const retailer_service_1 = require("../services/retailer.service");
function mergeNlApplyLines(lines) {
    const m = new Map();
    for (const l of lines) {
        m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity);
    }
    return [...m.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}
function retailerId(req) {
    return req.user.id;
}
class RetailerController {
}
exports.RetailerController = RetailerController;
_a = RetailerController;
RetailerController.listDistributors = (0, catchAsync_1.catchAsync)(async (_req, res) => {
    const data = await retailer_service_1.RetailerService.listDistributors();
    res.json({ success: true, data });
});
RetailerController.catalog = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const distributorId = Number(req.query.distributorId);
    const data = await retailer_service_1.RetailerService.getCatalog(distributorId);
    res.json({ success: true, data });
});
RetailerController.catalogChat = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { distributorId, messages } = req.body;
    const data = await (0, retailerCatalogChat_service_1.retailerCatalogChat)(distributorId, messages);
    res.json({ success: true, data });
});
RetailerController.getCart = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const data = await retailer_service_1.RetailerService.getCart(retailerId(req));
    res.json({ success: true, data });
});
RetailerController.upsertCartItem = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { productId, quantity } = req.body;
    await retailer_service_1.RetailerService.upsertCartItem(retailerId(req), productId, quantity);
    const data = await retailer_service_1.RetailerService.getCart(retailerId(req));
    res.json({ success: true, data });
});
RetailerController.removeCartItem = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const productId = Number(req.params.productId);
    await retailer_service_1.RetailerService.removeCartItem(retailerId(req), productId);
    const data = await retailer_service_1.RetailerService.getCart(retailerId(req));
    res.json({ success: true, data });
});
RetailerController.clearCart = (0, catchAsync_1.catchAsync)(async (req, res) => {
    await retailer_service_1.RetailerService.clearCart(retailerId(req));
    const data = await retailer_service_1.RetailerService.getCart(retailerId(req));
    res.json({ success: true, data });
});
RetailerController.checkout = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const body = req.body;
    const data = await retailer_service_1.RetailerService.checkout(retailerId(req), {
        deliverySiteId: body.deliverySiteId,
    });
    res.status(201).json({ success: true, data });
});
RetailerController.listOrders = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const result = await retailer_service_1.RetailerService.listOrders(retailerId(req), limit, offset);
    res.json({ success: true, ...result });
});
RetailerController.nlCartPreview = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { distributorId, message } = req.body;
    const data = await (0, retailerNlCart_service_1.previewNlCartOrder)(distributorId, message);
    res.json({ success: true, data });
});
RetailerController.nlCartApply = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { distributorId, lines } = req.body;
    const merged = mergeNlApplyLines(lines);
    await retailer_service_1.RetailerService.assertProductsBelongToDistributor(merged.map((l) => l.productId), distributorId);
    await retailer_service_1.RetailerService.addLinesToCartMerge(retailerId(req), merged);
    const data = await retailer_service_1.RetailerService.getCart(retailerId(req));
    res.json({ success: true, data });
});
