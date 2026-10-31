import mongoose from 'mongoose';

export async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env.');
  mongoose.connection.on('disconnected', () => console.error('MongoDB disconnected; database requests are unavailable.'));
  mongoose.connection.on('error', err => console.error('MongoDB connection error:', err.message));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected successfully');
}

export async function disconnectDB() { await mongoose.disconnect(); }
