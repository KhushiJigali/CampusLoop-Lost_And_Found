import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, maxlength: 30 },
  password_hash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export default mongoose.model('User', schema, 'users');
