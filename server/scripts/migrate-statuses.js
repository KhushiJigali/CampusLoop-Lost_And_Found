import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { migrateStatuses } from '../services/statusMigration.js';
import { rebuildMatches } from '../services/matchPersistence.js';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url))});
try {await connectDB(); console.log('Status migration:',await migrateStatuses()); await rebuildMatches();}
catch(error) {console.error(error.message);process.exitCode=1;}
finally {await disconnectDB();}
