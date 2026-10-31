import { fileURLToPath } from 'node:url';
import { MATCH_CONFIG } from '../config/constants.js';
let loading;
const cache=new Map();
let state={available:false,method:'tfidf-fallback',model:null,message:'Sentence embeddings have not been loaded.'};
export const semanticStatus=()=>({...state});
async function extractor() {
 if(process.env.MATCH_EMBEDDINGS==='false') {
  state={available:false,method:'tfidf-fallback',model:null,message:'Sentence embeddings disabled; using vocabulary-normalized TF-IDF.'};return null;
 }
 if(!loading) loading=(async()=>{
  try {
   const {pipeline,env}=await import('@huggingface/transformers');
   env.cacheDir=process.env.MATCH_MODEL_CACHE || fileURLToPath(new URL('../.model-cache/',import.meta.url));
   const pipe=await pipeline('feature-extraction',MATCH_CONFIG.embeddingModel,{dtype:MATCH_CONFIG.embeddingDtype,device:'cpu',local_files_only:process.env.MATCH_LOCAL_FILES_ONLY==='true'});
   state={available:true,method:'sentence-embedding',model:MATCH_CONFIG.embeddingModel,message:'Local CPU sentence embeddings are ready.'};console.log(state.message);return pipe;
  }catch(error){
   state={available:false,method:'tfidf-fallback',model:null,message:'Sentence model unavailable; using vocabulary-normalized TF-IDF. Check cache/network and restart to retry.'};console.warn(state.message,error.message);return null;
  }
 })();
 return loading;
}
export async function embedTexts(texts) {
 const pipe=await extractor();if(!pipe)return null;
 try {
  const missing=[...new Set(texts.filter(t=>t.trim()&&!cache.has(t)))];
  for(let i=0;i<missing.length;i+=16){const batch=missing.slice(i,i+16);const output=await pipe(batch,{pooling:'mean',normalize:true});output.tolist().forEach((v,j)=>cache.set(batch[j],v));}
  const result=texts.map(t=>cache.get(t)||null);if(cache.size>5000)cache.clear();return result;
 }catch(error){state={available:false,method:'tfidf-fallback',model:null,message:'Embedding inference failed; using TF-IDF for this matching pass.'};console.warn(state.message,error.message);return null;}
}
export function cosine(a,b){if(!a||!b)return null;let dot=0,an=0,bn=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];an+=a[i]**2;bn+=b[i]**2;}return an&&bn?Math.max(0,Math.min(1,dot/Math.sqrt(an*bn))):0;}
