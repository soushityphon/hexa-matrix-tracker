import { NODES as baseNodes } from './data.js';
import { fetchSharedPreview } from './preview-priorities.js';

// Source snapshots only. Player saves and visible class/sequence guards stay
// with their existing owners; this loader never renders or writes progress.
export function createClassLoader() {
  const classDataCache = new Map(), classRequests = new Map();
  const CLASS_CACHE_MS = 30000;
  const CLASS_REQUEST_MS = 15000;
  function requestClassData(className) {
    if(classRequests.has(className))return classRequests.get(className);
    const job=className==='ren'?'렌':undefined;
    const controller=new AbortController();
    let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
      reject(new Error('Loading timed out'));
      controller.abort();
    },CLASS_REQUEST_MS);});
    // Bound the whole operation, including response bodies.
    const reads=Promise.all([
      fetch('/api/tracker-catalogue'+(job?'?job='+encodeURIComponent(job):''),{cache:'no-store',signal:controller.signal}).then(async response=>{
        if(!response.ok)throw new Error('Saved skills are unavailable');
        return response.json();
      }),
      fetchSharedPreview(job,{signal:controller.signal})
    ]);
    const request=Promise.race([reads,deadline]).then(([model,shared])=>{
      const drafts=Object.fromEntries(Object.entries(shared).filter(([,draft])=>(draft.job==='렌'?'ren':'hoyoung')===className));
      // Add the optional tracker input even when Scouter omits Janus. Its
      // stable core identity also lets existing progress round-trip in backups.
      if(!model.nodes.some(node=>node.sourceKey==='generalCore1' || node.short==='Janus'))model={...model,nodes:[...model.nodes,{...baseNodes.find(node=>node.short==='Janus'),sourceKey:'generalCore1',initialLevel:0}]};
      model={...model,nodes:model.nodes.map(node=>({...node,isJanus:node.sourceKey==='generalCore1' || node.short==='Janus'}))};
      model={...model,stats:model.stats.map(node=>{
        const number={'HEXA Stat I':1,'HEXA Stat II':2,'HEXA Stat III':3}[node.short];
        return number ? {...node,icon:`assets/hexa-stats/stat-${number}-unlocked.png`} : node;
      })};
      const snapshot={model,drafts,loadedAt:Date.now()};
      classDataCache.set(className,snapshot);
      return snapshot;
    }).finally(()=>{
      clearTimeout(timer);controller.abort();
      if(classRequests.get(className)===request)classRequests.delete(className);
    });
    classRequests.set(className,request);
    return request;
  }
  return {
    request: requestClassData,
    cached(className) {
      const snapshot = classDataCache.get(className);
      return !classRequests.has(className) && snapshot && Date.now() - snapshot.loadedAt < CLASS_CACHE_MS ? snapshot : null;
    },
    invalidate(className) { classDataCache.delete(className); }
  };
}
