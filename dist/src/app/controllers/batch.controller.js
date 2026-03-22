"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const batch_service_1 = require("../services/batch.service");
class BatchController {
}
exports.BatchController = BatchController;
_a = BatchController;
BatchController.current = (0, catchAsync_1.catchAsync)(async (_req, res) => {
    const data = await batch_service_1.BatchService.getCurrentBatchPublic();
    res.json({ success: true, data });
});
