"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireDistributor = requireDistributor;
/** Requires `authMiddleware` to run first. */
function requireDistributor(req, res, next) {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    if (req.user.role !== 'distributor') {
        res.status(403).json({ message: 'Distributor role required' });
        return;
    }
    next();
}
