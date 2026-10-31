import { Router } from 'express';
import LostItem from '../models/LostItem.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
const router = Router();
router.get('/', wrap(async (req, res) => {
 const countIf=condition=>({$sum:{$cond:[condition,1,0]}});
 // All counts and distributions run inside MongoDB, across both report collections.
 const [result] = await LostItem.aggregate([
  { $unionWith: 'found_items' },
  { $facet: {
    totals: [{$group:{_id:null,active_lost:countIf({$and:[{$eq:['$item_type','lost']},{$eq:['$status','active']}]}),active_found:countIf({$and:[{$eq:['$item_type','found']},{$eq:['$status','active']}]}),returned:countIf({$eq:['$status','returned']}),total_reports:{$sum:1}}}],
    by_category: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
    by_location: [{ $group: { _id: '$campus_location', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]
  } }
 ]);
 res.json({ totals: result.totals[0] || { active_lost:0,active_found:0,returned:0,total_reports:0 }, by_category: result.by_category, by_location: result.by_location });
}));
export default router;
