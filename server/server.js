import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { LOCATIONS } from './config/constants.js';
import CampusLocation from './models/CampusLocation.js';
import LostItem from './models/LostItem.js';
import FoundItem from './models/FoundItem.js';
import Match from './models/Match.js';
import User from './models/User.js';
import { rebuildMatches } from './services/matchPersistence.js';
import { migrateStatuses } from './services/statusMigration.js';
dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) });
try {
 if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace-this')) throw new Error('Set JWT_SECRET to a random value of at least 32 characters in server/.env.');
 await connectDB();
 console.log('Status migration:',await migrateStatuses());
 await CampusLocation.bulkWrite(LOCATIONS.map(l => ({ updateOne: { filter: { name: l.name }, update: { $setOnInsert: l }, upsert: true } })));
 await Promise.all([CampusLocation, LostItem, FoundItem, Match, User].map(model => model.createIndexes()));
 await rebuildMatches();
 const server = createApp().listen(process.env.PORT || 5000, () => console.log(`Server running on port ${process.env.PORT || 5000}`));
 server.on('error', async error => { console.error(error.message); await disconnectDB(); process.exit(1); });
 let stopping = false;
 const shutdown = () => { if (stopping) return; stopping = true; const timer = setTimeout(() => process.exit(1), 10000); timer.unref(); server.close(async () => { await disconnectDB(); process.exit(0); }); };
 process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
} catch (err) { console.error('Startup failed:', err.message); await disconnectDB(); process.exit(1); }
