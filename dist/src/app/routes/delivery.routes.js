"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const delivery_controller_1 = require("../controllers/delivery.controller");
const router = (0, express_1.Router)();
router.get('/delivery-sites', delivery_controller_1.DeliveryController.listSites);
exports.default = router;
