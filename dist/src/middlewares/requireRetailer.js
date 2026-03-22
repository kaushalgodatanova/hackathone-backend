"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRetailer = requireRetailer;
/** Requires `authMiddleware` to run first. */
function requireRetailer(req, res, next) {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    if (req.user.role !== 'retailer') {
        res.status(403).json({ message: 'Retailer role required' });
        return;
    }
    next();
}
