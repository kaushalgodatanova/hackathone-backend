"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const batch_controller_1 = require("../controllers/batch.controller");
const router = (0, express_1.Router)();
router.get('/batch/current', batch_controller_1.BatchController.current);
exports.default = router;
