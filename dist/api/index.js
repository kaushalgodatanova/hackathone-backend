"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../src/server");
const env_1 = require("../src/config/env");
(0, env_1.loadEnv)();
const app = (0, server_1.createServer)();
exports.default = app;
