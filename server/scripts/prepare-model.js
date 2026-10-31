import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import {embedTexts,semanticStatus} from '../services/semanticService.js';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url))});
const result=await embedTexts(['Campus lost and found item matching.']);
console.log(semanticStatus());
if(!result)process.exitCode=1;
