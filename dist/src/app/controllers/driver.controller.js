"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const driver_service_1 = require("../services/driver.service");
function partnerId(req) {
    return req.user.id;
}
class DriverController {
}
exports.DriverController = DriverController;
_a = DriverController;
DriverController.listRuns = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const data = await driver_service_1.DriverService.listRuns(partnerId(req));
    res.json({ success: true, data });
});
DriverController.getRun = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const runId = Number(req.params.runId);
    if (!Number.isFinite(runId)) {
        res.status(400).json({ message: 'Invalid run id' });
        return;
    }
    const data = await driver_service_1.DriverService.getRunDetail(partnerId(req), runId);
    res.json({ success: true, data });
});
