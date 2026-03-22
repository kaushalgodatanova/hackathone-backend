"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireDriver = void 0;
const requireDriver = (req, res, next) => {
    if (req.user?.role !== 'delivery_partner') {
        res.status(403).json({ message: 'Delivery partner role required' });
        return;
    }
    next();
};
exports.requireDriver = requireDriver;
