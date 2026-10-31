import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { LOCATIONS, CATEGORIES } from '../config/constants.js';
import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import CampusLocation from '../models/CampusLocation.js';
import { rebuildMatches } from '../services/matchPersistence.js';
import { migrateStatuses } from '../services/statusMigration.js';
import {demoImage} from '../config/demoImages.js';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
export async function seed() {
 await migrateStatuses();
 await CampusLocation.bulkWrite(LOCATIONS.map(l => ({ updateOne: { filter: { name: l.name }, update: { $setOnInsert: l }, upsert: true } })));
 const user = await User.findOneAndUpdate({ email: 'demo@campus.example' }, { $setOnInsert: { name: 'Aarav Jain', role: 'student', password_hash: await bcrypt.hash('CampusDemo123!',10) } }, { upsert: true, new: true });
 const samples = [
  ['Black leather wallet','Wallet','Black','Wildcraft','Black leather wallet with college ID inside and a small scratch on the front','B Block'],
  ['Sage green water bottle','Water Bottle','Green','Milton','Green steel water bottle with a white mountain sticker','CCD'],
  ['Wireless earphones case','Earphones','White','boAt','White wireless earphones charging case with a blue dot sticker','Food Court'],
  ['Blue lanyard student ID','ID Card','Blue','','College student identification card on a blue lanyard','A Block'],
  ['Library key ring','Keys','Silver','','Three silver keys with a red bicycle keychain','C Block'],
  ['Navy folding umbrella','Umbrella','Blue','','Navy blue umbrella with a curved wooden handle','D Block'],
  ['Engineering mathematics book','Book','Blue','','Engineering mathematics textbook with handwritten notes','M Block'],
  ['Gray laptop backpack','Bag','Gray','Skybags','Gray backpack with a small orange patch on the front pocket','G Block'],
  ['Digital sports watch','Watch','Black','Casio','Black digital watch with a scratched buckle','H Block'],
  ['USB-C charging cable','Mobile Accessory','White','','White braided USB-C cable with green tape at one end','Polytechnic Block'],
  ['Metal USB drive','USB Drive','Silver','SanDisk','Silver 32 GB USB drive on a blue key ring','Parking Space'],
  ['Scientific calculator','Calculator','Black','Casio','Black scientific calculator with initials AJ on the back',"Girls' Hostel"],
  ['Yellow water bottle','Water Bottle','Yellow','Milton','Yellow plastic bottle with a green cap','Bank of Baroda'],
  ['Brown leather wallet','Wallet','Brown','','Brown wallet with a zip pocket','Engineering Gate'],
  ['Green notebook','Book','Green','','Green notebook with physics notes','Polytechnic Gate'],
  ['Basketball drawstring bag','Bag','Red','','Red drawstring bag with basketball shoes','Basketball Court'],
  ['Wired black earphones','Earphones','Black','','Black wired earphones in a small cloth pouch','Mangalore Canteen']
 ];
 for (let i = 0; i < samples.length; i++) {
  const [title,category,color,brand,description,campus_location] = samples[i];
  const common = { title, category, color, ...(brand ? { brand } : {}), description, campus_location, specific_location: i % 2 ? 'Near the entrance' : 'Near staircase', reported_by: user._id, status: i === 16 ? 'returned' : 'active' };
  const day = new Date(); day.setUTCDate(day.getUTCDate() - 2 - i % 7); const lostDate = day.toISOString().slice(0,10); day.setUTCDate(day.getUTCDate()+1); const foundDate = day.toISOString().slice(0,10);
  // Idempotent: only insert missing demo documents; never erase user reports.
  await LostItem.updateOne({ demo_key:`lost-${i}` }, { $setOnInsert: { ...common, date_lost:lostDate, demo_key:`lost-${i}`, ...(i === 1 ? { extra_attributes:{capacity:'1 litre',material:'Steel'} } : {}) } }, { upsert:true });
  const foundDescriptions=[
   'Found a black leather wallet with a student identity card inside and a small scratch on the front.',
   'Found a green Milton steel bottle with a white sticker showing a mountain.',
   'A white boAt charging case for wireless earbuds, marked with a tiny blue dot sticker.',
   'Found a college identity card attached to a blue lanyard.',
   'Picked up three silver keys attached to a red bicycle key ring.',
   'A folding navy umbrella with a curved wooden grip was left near the staircase.',
   'Found an engineering maths textbook containing handwritten annotations.',
   'A gray Skybags rucksack with an orange patch on its front pocket.'
  ];
  if (i < 8 || i === 16) {
   await FoundItem.updateOne({demo_key:`found-${i}`},{$setOnInsert:{...common,description:foundDescriptions[i]||description,title:i===0?'Black wallet with student ID':title,date_found:foundDate,demo_key:`found-${i}`}},{upsert:true});
   // Upgrade only the exact original demo description; keep user edits intact.
   if(foundDescriptions[i])await FoundItem.updateOne({demo_key:`found-${i}`,description},{$set:{description:foundDescriptions[i]}});
  }
  // Backfill missing demo images only; never replace a user's uploaded photo.
  for(const [Model,key] of [[LostItem,`lost-${i}`],...(i<8||i===16?[[FoundItem,`found-${i}`]]:[])]){
   await Model.updateOne({demo_key:key,$or:[{image_url:{$exists:false}},{image_url:null},{image_url:''}]},{$set:{image_url:demoImage(i)}});
  }
 }
 await Promise.all([User,LostItem,FoundItem,Match,CampusLocation].map(m => m.createIndexes()));
 await rebuildMatches();
 return { lost:await LostItem.countDocuments(), found:await FoundItem.countDocuments(), matches:await Match.countDocuments(), locations:await CampusLocation.countDocuments() };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
 try { await connectDB(); console.log('Seed complete:', await seed()); console.log('Demo login: demo@campus.example / CampusDemo123!'); }
 catch(e) { console.error(e.message); process.exitCode = 1; }
 finally { await disconnectDB(); }
}
