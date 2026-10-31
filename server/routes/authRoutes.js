import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, fail } from '../utils/asyncHandler.js';
const router = Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 80, standardHeaders: 'draft-7', legacyHeaders: false }));
const session = user => ({ token: jwt.sign({}, process.env.JWT_SECRET, { subject: String(user._id), expiresIn: '12h' }), user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
router.post('/register', asyncHandler(async (req, res) => {
 const { name, email, phone, password, role } = req.body;
 if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) fail(400, 'Enter a name, valid email, and password of 8–128 characters.');
 if (role && !['student', 'staff'].includes(role)) fail(400, 'Choose student or staff.');
 const user = await User.create({ name, email, phone, role: role || 'student', password_hash: await bcrypt.hash(password, 10) });
 res.status(201).json(session(user));
}));
router.post('/login', asyncHandler(async (req, res) => {
 if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') fail(400, 'Email and password are required.');
 const user = await User.findOne({ email: req.body.email.trim().toLowerCase() }).select('+password_hash');
 if (!user || !await bcrypt.compare(req.body.password, user.password_hash)) fail(401, 'Incorrect email or password.');
 res.json(session(user));
}));
router.get('/me', auth, (req, res) => res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }));
export default router;
