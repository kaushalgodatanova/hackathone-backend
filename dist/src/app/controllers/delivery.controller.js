"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const delivery_service_1 = require("../services/delivery.service");
class DeliveryController {
}
exports.DeliveryController = DeliveryController;
_a = DeliveryController;
DeliveryController.listSites = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const retailOnly = String(req.query.retailOnly ?? 'true') !== 'false';
    const data = await delivery_service_1.DeliveryService.listSites({ retailDropsOnly: retailOnly });
    res.json({ success: true, data });
});
