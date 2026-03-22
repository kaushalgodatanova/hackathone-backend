"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const product_service_1 = require("../services/product.service");
function distributorId(req) {
    return req.user.id;
}
function actorId(req) {
    return req.user.id;
}
class ProductController {
}
exports.ProductController = ProductController;
_a = ProductController;
ProductController.list = (0, catchAsync_1.catchAsync)(async (req, res) => {
    console.log('list', req.user, distributorId(req));
    const data = await product_service_1.ProductService.listForDistributor(distributorId(req));
    res.json({ success: true, data });
});
ProductController.getById = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const id = Number(req.params.id);
    const row = await product_service_1.ProductService.getByIdForDistributor(id, distributorId(req));
    if (!row) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
    }
    res.json({ success: true, data: row });
});
ProductController.create = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const data = await product_service_1.ProductService.create(distributorId(req), actorId(req), req.body);
    res.status(201).json({ success: true, data });
});
ProductController.update = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const id = Number(req.params.id);
    const data = await product_service_1.ProductService.update(id, distributorId(req), req.body);
    res.json({ success: true, data });
});
ProductController.remove = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const id = Number(req.params.id);
    await product_service_1.ProductService.deleteHard(id, distributorId(req));
    res.json({ success: true, message: 'Product deleted' });
});
ProductController.stockAdd = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const id = Number(req.params.id);
    const data = await product_service_1.ProductService.addStock(id, distributorId(req), actorId(req), req.body);
    res.json({ success: true, data });
});
ProductController.stockRemove = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const id = Number(req.params.id);
    const data = await product_service_1.ProductService.removeStock(id, distributorId(req), actorId(req), req.body);
    res.json({ success: true, data });
});
ProductController.stockSet = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const id = Number(req.params.id);
    const data = await product_service_1.ProductService.setStock(id, distributorId(req), actorId(req), req.body);
    res.json({ success: true, data });
});
ProductController.stockMovements = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const id = Number(req.params.id);
    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const { rows, limit: lim, offset: off } = await product_service_1.ProductService.listMovements(id, distributorId(req), limit, offset);
    res.json({ success: true, data: rows, meta: { limit: lim, offset: off } });
});
