import mongoose from 'mongoose';
import { CATEGORIES } from '../config/constants.js';
export function itemSchema(type) {
  const schema = new mongoose.Schema({
    item_type: { type: String, enum: [type], default: type, immutable: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, enum: CATEGORIES, required: true },
    color: { type: String, trim: true, maxlength: 80 }, brand: { type: String, trim: true, maxlength: 100 },
    model: { type: String, trim: true, maxlength: 100 }, unique_features: { type: String, maxlength: 1000 },
    campus_location: { type: String, required: true }, specific_location: { type: String, maxlength: 300 },
    [type === 'lost' ? 'date_lost' : 'date_found']: { type: Date, required: true },
    image_url: { type: String, maxlength: 500 },
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'returned'], default: 'active' },
    // Flexible document attributes support details that differ across item types.
    extra_attributes: { type: Map, of: String, default: undefined },
    demo_key: { type: String, select: false }
  }, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
  schema.index({ category: 1, status: 1 });
  schema.index({ campus_location: 1, status: 1 });
  schema.index({ status: 1 });
  schema.index({ [type === 'lost' ? 'date_lost' : 'date_found']: -1 });
  schema.index({ title: 'text', description: 'text', unique_features: 'text' });
  schema.index({ reported_by: 1, created_at: -1 });
  return schema;
}
