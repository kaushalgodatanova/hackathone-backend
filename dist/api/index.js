"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../src/init-env");
const server_1 = require("../src/server");
const app = (0, server_1.createServer)();
exports.default = app;
