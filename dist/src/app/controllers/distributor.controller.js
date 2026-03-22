"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributorController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const retailer_service_1 = require("../services/retailer.service");
function distributorId(req) {
    return req.user.id;
}
class DistributorController {
}
exports.DistributorController = DistributorController;
_a = DistributorController;
DistributorController.orderStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const data = await retailer_service_1.RetailerService.getOrderStatsForDistributor(distributorId(req));
    res.json({ success: true, data });
});
DistributorController.listOrders = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const result = await retailer_service_1.RetailerService.listOrdersForDistributor(distributorId(req), limit, offset);
    res.json({ success: true, ...result });
});
