"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
const openapi_1 = require("./openapi");
fs_1.default.writeFileSync('openapi.json', JSON.stringify(openapi_1.openApiDocument, null, 2));
logger_1.logger.info('✅ Generated openapi.json');
