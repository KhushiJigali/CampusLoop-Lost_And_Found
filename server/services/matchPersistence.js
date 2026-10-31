import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import { rankPairs } from './matchingService.js';

// Serialize report changes + recomputation within this single-process prototype.
let queue = Promise.resolve();
export function withReportLock(task) { const result = queue.then(task); queue = result.catch(() => {}); return result; }
export async function rebuildMatches() {
 const [lost, found] = await Promise.all([LostItem.find({ status: 'active' }).lean(), FoundItem.find({ status: 'active' }).lean()]);
 const pairs=await rankPairs(lost,found);
 const operations=pairs.map(({lost:l,found:f,score})=>({updateOne:{filter:{lost_item_id:l._id,found_item_id:f._id},update:{$set:score},upsert:true}}));
 if (operations.length) await Match.bulkWrite(operations);
 await Match.deleteMany({ $or: [{ lost_item_id: { $nin: lost.map(l => l._id) } }, { found_item_id: { $nin: found.map(f => f._id) } }] });
}
