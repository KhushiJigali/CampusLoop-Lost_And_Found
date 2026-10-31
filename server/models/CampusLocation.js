import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['academic_block', 'common_area', 'other'], required: true },
  active: { type: Boolean, default: true },
  // Optional GeoJSON: add verified campus coordinates later, never invented coordinates.
  coordinates: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number], default: undefined, validate: { validator: a => !a || (a.length === 2 && a[0] >= -180 && a[0] <= 180 && a[1] >= -90 && a[1] <= 90), message: 'Invalid longitude/latitude' } } }
});
schema.index({ coordinates: '2dsphere' });
export default mongoose.model('CampusLocation', schema, 'campus_locations');
