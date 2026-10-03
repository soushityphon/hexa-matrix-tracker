// Owner-only Ren capture review. Never promotes a priority or returns a profile.
import {acquireScouterCatalogue} from './scouter-catalogue-acquisition.js';
import {prepareRankedProfileRequest} from './scouter-profile-request.js';
import {acquireScouterOrder} from './scouter-order-acquisition.js';
import {discoverySelection} from './scouter-discovery.js';

async function sourceJSON(url,apiKey,fetchImpl,timeoutMs) {
  const controller=new AbortController();
  let reject;
  const deadline=new Promise((_,r)=>{reject=r;});
  const timer=setTimeout(()=>{controller.abort();reject(new Error('Ren profile request timed out'));},timeoutMs);
  const bounded=value=>Promise.race([value,deadline]);
  try {
    const response=await bounded(fetchImpl(url,{redirect:'manual',credentials:'omit',signal:controller.signal,headers:{'api-key':apiKey,Accept:'application/json'}}));
    if(!response.ok)throw new Error(`Scouter profile returned ${response.status}`);
    if((response.url&&response.url!==url)||!response.body||Number(response.headers.get('Content-Length'))>2000000)throw new Error('Ren profile response needs review');
    const reader=response.body.getReader(),parts=[];let size=0,complete=false;
    try {while(true){const part=await bounded(reader.read());if(part.done){complete=true;break;}size+=part.value.byteLength;if(size>2000000)throw new Error('Ren profile response needs review');parts.push(part.value);}}
    finally {if(!complete)void reader.cancel().catch(()=>{});reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  } finally {clearTimeout(timer);controller.abort();}
}
function safeError(error) {
  return /^(?:Scouter (?:profile returned \d+|order returned \d+; stop without retries|order acquisition timed out|response failed reconstruction validation)|Ren profile request timed out)$/.test(error?.message)?error.message:'Ren capture could not be validated. Saved data is unchanged.';
}
export async function captureRenPreview({apiKey,region='KMS',fetchImpl=globalThis.fetch,catalogueImpl=acquireScouterCatalogue,orderImpl=acquireScouterOrder,timeoutMs=25000}={}) {
  if(!['GMS','KMS'].includes(region))throw new Error('Choose GMS or KMS');
  if(typeof apiKey!=='string'||!apiKey||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>25000)throw new Error('Ren request is not configured');
  const result={job:'렌',region,captures:{},publishable:false};
  try {
    const catalogue=await catalogueImpl('렌',region,'Heroic',{fetchImpl,timeoutMs});
    const rankingResponse=await sourceJSON('https://api.maplescouter.com/api/ranking?region=kms&job=%EB%A0%8C&world=%EC%A0%84%EC%B2%B4&page=1&pageSize=30',apiKey,fetchImpl,timeoutMs);
    const ranking=rankingResponse?.rankingData?.[0];
    if(ranking?.ranking!==1||ranking.job!=='렌'||typeof ranking.name!=='string'||!ranking.name)throw new Error('Rank 1 Ren profile unavailable');
    const profile=await sourceJSON('https://api.maplescouter.com/api/id?name='+encodeURIComponent(ranking.name)+'&region=kms&preset=00000',apiKey,fetchImpl,timeoutMs);
    // Validate the real profile against the freshly acquired source inventory.
    prepareRankedProfileRequest(profile,ranking,catalogue,{sourceRegion:'KMS',region,world:'Heroic',allWorlds:true});
    result.catalogue=catalogue;
    result.benchmark={name:ranking.name,job:'렌',characterLevel:ranking.level,world:profile.userApiData.info.world_name,sourceRegion:'KMS',ranking:1,rankingContext:'All-world HEXA converted strength'};
    for(const world of ['Heroic','Interactive']) {
      const scoped={...catalogue,selection:discoverySelection(region,world)};
      const body=prepareRankedProfileRequest(profile,ranking,scoped,{sourceRegion:'KMS',region,world,allWorlds:true});
      const expected=JSON.stringify(body);
      // Trusted constructor validation for this capture-only path. This does
      // not seed or bypass the separate reusable semantic review registry.
      const candidate=await orderImpl(body,scoped,{apiKey,fetchImpl,timeoutMs,validatePrepared:prepared=>JSON.stringify(prepared)===expected});
      const stats=candidate.steps.filter(s=>/^hexaStat[123]$/i.test(s.coreId));
      if(candidate.issues.length||stats.length!==3||new Set(stats.map(s=>s.coreId.toLowerCase())).size!==3||stats.some(s=>s.from!==0||s.level!==20))throw new Error('Scouter response failed reconstruction validation');
      result.captures[world.toLowerCase()]=candidate;
    }
  } catch(error) {result.error=safeError(error);}
  return result;
}

// Coalesce concurrent owner clicks and retain failures as well as successes.
// No retries; a refusal pauses this route for the same five-minute window.
const recent=new Map();
const pauses=new Map();
export async function cachedRenPreview(apiKey,region) {
  const pause=pauses.get(apiKey);
  if(pause&&pause.until>Date.now())return {job:'렌',region,captures:{},error:pause.error,publishable:false};
  const key=apiKey+':'+region;
  const old=recent.get(key);
  if(old&&Date.now()-old.at<300000)return old.promise;
  const promise=captureRenPreview({apiKey,region});
  void promise.then(result=>{if(/(?:429|430)/.test(result.error || ''))pauses.set(apiKey,{until:Date.now()+300000,error:result.error});});
  recent.set(key,{at:Date.now(),promise});
  return promise;
}
