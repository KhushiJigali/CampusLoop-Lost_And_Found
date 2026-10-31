import { Router } from 'express';
import LostItem from '../models/LostItem.js';
import CampusLocation from '../models/CampusLocation.js';
import { filters, pagination } from '../controllers/itemController.js';
import { asyncHandler as wrap, fail } from '../utils/asyncHandler.js';
const router = Router();
router.get('/', wrap(async (req, res) => {
 if (req.query.type && !['lost', 'found'].includes(req.query.type)) fail(400, 'Invalid report type.');
 const { page, limit } = pagination(req.query);
 const lf = filters(req.query, 'lost'), ff = filters(req.query, 'found');
 if (req.query.near) {
  if (typeof req.query.near !== 'string') fail(400, 'Invalid location.');
  const location = await CampusLocation.findOne({ name: req.query.near, active: true }).lean();
  if (!location) fail(400, 'Unknown campus location.');
  if (!location.coordinates?.coordinates?.length) fail(422, 'Verified coordinates have not been configured for this location. Use the campus location filter.');
  const radius = Number(req.query.radius || 300);
  if (!Number.isFinite(radius) || radius < 1 || radius > 5000) fail(400, 'Radius must be 1–5000 meters.');
  const nearby = await CampusLocation.find({ active: true, coordinates: { $near: { $geometry: location.coordinates, $maxDistance: radius } } }).lean();
  lf.campus_location = ff.campus_location = { $in: nearby.map(l => l.name) };
 }
 // $match is first in each collection pipeline so MongoDB can use its indexes.
 const pipeline = [{ $match: req.query.type === 'found' ? { _id: null } : lf }];
 if (req.query.type !== 'lost') pipeline.push({ $unionWith: { coll: 'found_items', pipeline: [{ $match: ff }] } });
 pipeline.push({ $facet: { items: [{ $sort: { created_at: -1, _id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } });
 // Aggregation does not cast ObjectId values automatically.
 if (lf.reported_by) { const { default: mongoose } = await import('mongoose'); lf.reported_by = new mongoose.Types.ObjectId(lf.reported_by); ff.reported_by = new mongoose.Types.ObjectId(ff.reported_by); }
 const [data] = await LostItem.aggregate(pipeline);
 const total = data.total[0]?.count || 0;
 res.json({ items: data.items, total, page, pages: Math.ceil(total / limit) });
}));
export default router;
