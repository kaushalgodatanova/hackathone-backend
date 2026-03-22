"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Messages = void 0;
const errors_messages_json_1 = __importDefault(require("./errors.messages.json"));
const users_messages_json_1 = __importDefault(require("./users.messages.json"));
exports.Messages = {
    errors: errors_messages_json_1.default,
    users: users_messages_json_1.default,
};
