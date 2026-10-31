import { Router } from 'express';
import Match from '../models/Match.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import { checkId } from '../controllers/itemController.js';
import { MATCH_CONFIG } from '../config/constants.js';
import { semanticStatus } from '../services/semanticService.js';
import { asyncHandler as wrap, fail } from '../utils/asyncHandler.js';
const router = Router();
router.get('/', wrap(async (req, res) => {
 const items = await Match.find().sort({ final_score: -1 }).limit(50).populate('lost_item_id').populate('found_item_id').lean();
 res.json({ items, config: MATCH_CONFIG, semantic:semanticStatus() });
}));
router.get('/found/:id', wrap(async (req, res) => {
 checkId(req.params.id); if (!await FoundItem.exists({ _id: req.params.id })) fail(404, 'Report not found.');
 res.json({ items: await Match.find({ found_item_id: req.params.id }).sort({ final_score: -1 }).limit(MATCH_CONFIG.limit).populate('lost_item_id').populate('found_item_id').lean(), config: MATCH_CONFIG });
}));
router.get('/:id', wrap(async (req, res) => {
 checkId(req.params.id); if (!await LostItem.exists({ _id: req.params.id })) fail(404, 'Report not found.');
 res.json({ items: await Match.find({ lost_item_id: req.params.id }).sort({ final_score: -1 }).limit(MATCH_CONFIG.limit).populate('lost_item_id').populate('found_item_id').lean(), config: MATCH_CONFIG });
}));
export default router;
