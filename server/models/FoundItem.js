import mongoose from 'mongoose';
import { itemSchema } from './itemSchema.js';
export default mongoose.model('FoundItem', itemSchema('found'), 'found_items');
