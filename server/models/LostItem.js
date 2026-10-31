import mongoose from 'mongoose';
import { itemSchema } from './itemSchema.js';
export default mongoose.model('LostItem', itemSchema('lost'), 'lost_items');
