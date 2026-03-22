"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const auth_service_1 = require("../services/auth.service");
class AuthController {
}
exports.AuthController = AuthController;
_a = AuthController;
AuthController.register = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await auth_service_1.AuthService.register(req.body);
    if ('error' in result) {
        if (result.error === 'email_taken') {
            res.status(409).json({ message: 'An account with this email already exists' });
            return;
        }
        res.status(500).json({ message: 'Registration failed' });
        return;
    }
    res.status(201).json({
        accessToken: result.accessToken,
        user: result.user,
    });
});
AuthController.login = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await auth_service_1.AuthService.login(req.body);
    if ('error' in result) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
    }
    res.json({
        accessToken: result.accessToken,
        user: result.user,
    });
});
AuthController.me = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const user = await auth_service_1.AuthService.getProfile(req.user.id);
    res.json({ user });
});
AuthController.patchProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const user = await auth_service_1.AuthService.patchProfile(req.user.id, req.user.role, req.body);
    res.json({ user });
});
