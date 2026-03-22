"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("../app/routes"));
const errorHandler_1 = require("../middlewares/errorHandler");
const loggerMiddleware_1 = require("../middlewares/loggerMiddleware");
function corsOrigins() {
    const raw = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const list = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (list.length === 0)
        return 'http://localhost:3000';
    if (list.length === 1)
        return list[0];
    return list;
}
const isProduction = process.env.NODE_ENV === 'production';
const createApp = () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        // Dev: reflect browser Origin so any localhost port (3000, 3001, …) works without CORS errors.
        // Prod: only listed FRONTEND_URL value(s).
        origin: isProduction ? corsOrigins() : true,
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(loggerMiddleware_1.loggerMiddleware);
    app.get('/api/health', (_req, res) => {
        res.status(200).json({ message: 'OK' });
    });
    app.use('/api', routes_1.default);
    // Handle Error
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.createApp = createApp;
