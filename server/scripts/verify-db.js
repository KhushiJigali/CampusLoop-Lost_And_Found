import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import CampusLocation from '../models/CampusLocation.js';
dotenv.config({ path:fileURLToPath(new URL('../.env',import.meta.url)) });
try {
 await connectDB();
 console.log('Database:',LostItem.db.name);
 console.log('Counts:', { lost:await LostItem.countDocuments(),found:await FoundItem.countDocuments(),matches:await Match.countDocuments(),locations:await CampusLocation.countDocuments() });
 console.log('Lost indexes:',await LostItem.collection.indexes());
 console.log('Text query:',await LostItem.find({$text:{$search:'wallet'}}).select('title campus_location').lean());
 console.log('Aggregation:',await LostItem.aggregate([{$group:{_id:'$campus_location',count:{$sum:1}}},{$sort:{count:-1}}]));
} catch(e) { console.error(e.message); process.exitCode=1; } finally { await disconnectDB(); }
