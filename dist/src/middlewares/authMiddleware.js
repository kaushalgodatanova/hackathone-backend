"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const authMiddleware = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Missing or invalid Authorization header' });
        return;
    }
    const token = header.slice('Bearer '.length).trim();
    try {
        const { sub, email, role, name } = await (0, jwt_1.verifyAccessToken)(token);
        const id = Number(sub);
        if (!Number.isFinite(id)) {
            res.status(401).json({ message: 'Invalid token subject' });
            return;
        }
        req.user = { id, email, role, name };
        next();
    }
    catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
