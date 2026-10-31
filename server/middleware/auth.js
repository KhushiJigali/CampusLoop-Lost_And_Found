import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function auth(req, res, next) {
 try {
   const token = req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7);
   if (!token) return res.status(401).json({ message: 'Please sign in.' });
   const payload = jwt.verify(token, process.env.JWT_SECRET);
   req.user = await User.findById(payload.sub);
   if (!req.user) return res.status(401).json({ message: 'Account no longer exists.' });
   next();
 } catch (err) { if (err.name?.includes('Token') || err.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Session expired. Please sign in.' }); next(err); }
}
