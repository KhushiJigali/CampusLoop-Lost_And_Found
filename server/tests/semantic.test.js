import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPairs} from '../services/matchingService.js';
import {semanticStatus} from '../services/semanticService.js';
process.env.MATCH_LOCAL_FILES_ONLY='true';
test('Real cached sentence model: paraphrases, unrelated item, dynamic normalization', {timeout:120000},async()=>{
 const lost={title:'Black leather wallet',description:'Black leather wallet containing my college ID',category:'Wallet',campus_location:'B Block',date_lost:'2026-10-25'};
 const found={title:'Found wallet',description:'Found a black leather wallet with a student identity card inside',category:'Wallet',campus_location:'B Block',date_found:'2026-10-26'};
 const unrelated={title:'Physics textbook',description:'A green physics textbook full of mechanics formulas and handwritten diagrams',category:'Book',color:'Green',campus_location:'CCD',date_found:'2026-10-26'};
 const results=await rankPairs([lost],[found,unrelated]);
 assert.equal(semanticStatus().available,true,'Run npm run model:prepare first. Semantic verification must not silently use the fallback.');
 assert.equal(results[0].score.text_method,'sentence-embedding');
 assert.ok(results[0].score.text_similarity>.80,JSON.stringify(results[0].score));
 assert.ok(results[0].score.final_score>.90,JSON.stringify(results[0].score));
 assert.equal(results[0].score.attribute_match,null);
 assert.ok(results[0].score.final_score>results[1].score.final_score+.35);
 console.log('Verified wallet pair:',JSON.stringify(results[0].score));
});
