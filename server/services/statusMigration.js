import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
// Idempotent: preserve reports, owners, images and dates. Both legacy inactive
// states map to returned; no old closed report is silently reactivated.
export async function migrateStatuses() {
 const results = await Promise.all([LostItem,FoundItem].map(m => m.collection.updateMany(
   {status:{$in:['recovered','closed']}},{$set:{status:'returned'}}
 )));
 return {lost:results[0].modifiedCount,found:results[1].modifiedCount};
}
