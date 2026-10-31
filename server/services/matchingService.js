import { MATCH_CONFIG } from '../config/constants.js';
import { embedTexts, cosine, semanticStatus } from './semanticService.js';
const stop = new Set('a an the and or with of in on at near for to my i it is was found lost containing contains inside has have some this that from me'.split(' '));
const synonyms = { student:'college', identity:'id', identification:'id', grey:'gray', blackish:'black', carrying:'contains', containing:'contains', contained:'contains', discovered:'found', picked:'found', purse:'wallet', rucksack:'backpack', bag:'backpack', flask:'bottle', earbuds:'earphones', headphones:'earphones' };
export function tokenize(text) {
 const canonical=String(text||'').toLowerCase().replace(/\b(?:student|college)\s+(?:identity|identification|id)\s+card\b/g,'college id').replace(/\bid\s+card\b/g,'college id');
 return (canonical.match(/[a-z0-9]+/g)||[]).map(t=>synonyms[t]||t).filter(t=>!stop.has(t));
}
const description=item=>item.description||item.title||'';
const words = item => tokenize(description(item));
const normalized = value => String(value || '').trim().toLowerCase();
// Fit smoothed inverse document frequencies on the query + current candidates.
export function textSimilarities(query, candidates) {
 const docs = [query, ...candidates].map(words);
 const df = new Map();
 for (const doc of docs) for (const word of new Set(doc)) df.set(word, (df.get(word) || 0) + 1);
 const vectors = docs.map(doc => {
   const counts = new Map(); for (const word of doc) counts.set(word, (counts.get(word) || 0) + 1);
   const vector = new Map([...counts].map(([w, n]) => [w, (n / (doc.length || 1)) * (Math.log((1 + docs.length) / (1 + df.get(w))) + 1)]));
   const norm = Math.sqrt([...vector.values()].reduce((sum, v) => sum + v * v, 0));
   return { vector, norm };
 });
 return vectors.slice(1).map(v => {
   if (!v.norm || !vectors[0].norm) return 0;
   let dot = 0; for (const [w, n] of vectors[0].vector) dot += n * (v.vector.get(w) || 0);
   return Math.min(1, dot / (v.norm * vectors[0].norm));
 });
}
const lexicalPair=(a,b)=>textSimilarities({description:a},[{description:b}])[0];
export function scorePair(lost, found, text_similarity, details={}) {
 const reasons=[`${details.text_method==='sentence-embedding'?'Semantic':'TF-IDF fallback'} text similarity: ${Math.round(text_similarity*100)}%`];
 const category_match=lost.category&&found.category?Number(lost.category===found.category):null;
 if(category_match!==null)reasons.push(category_match?'Same category':'Different categories');
 const attributes=['color','brand','model'].filter(k=>normalized(lost[k])&&normalized(found[k]));
 const scores=attributes.map(k=>{const equal=tokenize(lost[k]).join(' ')===tokenize(found[k]).join(' ');reasons.push(`${k[0].toUpperCase()+k.slice(1)} ${equal?'matches':'differs'}`);return Number(equal);});
 if(normalized(lost.unique_features)&&normalized(found.unique_features)){
  const similarity=details.feature_similarity??lexicalPair(lost.unique_features,found.unique_features);scores.push(similarity);reasons.push(`Unique features similarity: ${Math.round(similarity*100)}%`);
 }
 const attribute_match=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
 if(attribute_match===null)reasons.push('Attributes unavailable; weight redistributed');
 let location_score=null;
 if(lost.campus_location&&found.campus_location){
  const same=lost.campus_location===found.campus_location;location_score=Number(same);reasons.push(same?'Same campus location':'Different campus locations');
  if(same&&normalized(lost.specific_location)&&normalized(found.specific_location)){
   const specific=details.specific_similarity??lexicalPair(lost.specific_location,found.specific_location);
   location_score=MATCH_CONFIG.locationCampusWeight+MATCH_CONFIG.locationSpecificWeight*specific;reasons.push(`Specific location similarity: ${Math.round(specific*100)}%`);
  }
 }
 const days=(new Date(found.date_found)-new Date(lost.date_lost))/86400000;
 const date_score=Number.isFinite(days)?days>=0?Math.exp(-days/MATCH_CONFIG.dateDecayDays):0:null;
 if(date_score!==null)reasons.push(days>=0?`Found ${Math.round(days)} day(s) after loss`:'Found date precedes loss');
 // Image uploads are supported, but comparison is not. URLs are never similarity evidence.
 const image_similarity=null;reasons.push('Image similarity unavailable; weight redistributed');
 const components={text:text_similarity,category:category_match,attributes:attribute_match,location:location_score,date:date_score,image:image_similarity};
 const totalWeight=Object.entries(components).reduce((sum,[k,v])=>sum+(v===null?0:MATCH_CONFIG.weights[k]),0);
 const effective_weights=Object.fromEntries(Object.entries(components).map(([k,v])=>[k,v===null?0:MATCH_CONFIG.weights[k]/totalWeight]));
 const final_score=Object.entries(components).reduce((sum,[k,v])=>sum+(v??0)*effective_weights[k],0);
 return {text_similarity,category_match,attribute_match,location_score,date_score,image_similarity,image_available:false,final_score,
  match_level:final_score>=MATCH_CONFIG.high?'High':final_score>=MATCH_CONFIG.medium?'Medium':'Low',reasons,effective_weights,
  text_method:details.text_method||'tfidf-fallback',model:details.model||null,scoring_version:MATCH_CONFIG.version};
}
export async function rankPairs(lost,found){
 const all=[...lost,...found],texts=all.flatMap(item=>[description(item),item.unique_features||'',item.specific_location||'']);
 const vectors=all.length?await embedTexts(texts):null,info=semanticStatus();
 return found.flatMap((f,fi)=>{
  const lexical=textSimilarities(f,lost),offset=(lost.length+fi)*3;
  return lost.map((l,li)=>{
   const semantic=vectors?cosine(vectors[li*3],vectors[offset]):null;
   const score=semantic===null?lexical[li]:MATCH_CONFIG.semanticWeight*semantic+MATCH_CONFIG.lexicalWeight*lexical[li];
   return {lost:l,found:f,score:scorePair(l,f,score,{
    text_method:semantic===null?'tfidf-fallback':'sentence-embedding',model:semantic===null?null:info.model,
    feature_similarity:vectors?cosine(vectors[li*3+1],vectors[offset+1]):null,
    specific_similarity:vectors?cosine(vectors[li*3+2],vectors[offset+2]):null
   })};
  });
 });
}
