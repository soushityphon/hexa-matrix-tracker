import { DUNGEON_WEEKLY_FRAGMENTS } from './fragment-calculator.js';
import { validateStatLines } from './hexa-stat.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value,max) => Number.isInteger(value) && value >= 0 && value <= max;
const safeKey = key => !['__proto__','prototype','constructor'].includes(key);
const record = (value,valid) => object(value) && Object.entries(value).every(([key,item]) => safeKey(key) && valid(item,key));
const lines = value => value === null || validateStatLines(value).valid;
const state = value => object(value) && integer(value.level,30) &&
  ['unlocked','complete'].every(key => value[key] === undefined || typeof value[key] === 'boolean') &&
  (value.lines === undefined || lines(value.lines));

// v1 saves predate Stat lines and infographic history. Missing optional fields
// stay missing: the existing Stat migration retains totals without inventing a
// line split, and the renderer supplies defaults only for absent settings.
export function validatePlayerSave(value) {
  if (!object(value)) return false;
  const maps = {
    levels:(v,key)=>integer(v,/^HEXA Stat (I|II|III)$/.test(key)?20:30),
    statUnlocked:v=>typeof v==='boolean', statCompleted:v=>typeof v==='boolean',
    statLines:lines,
    infographicUndo:v=>object(v) && typeof v.sequence==='string' && record(v.skills,stack=>Array.isArray(stack) && stack.every(item=>
      object(item) && typeof item.key==='string' && typeof item.skill==='string' && state(item.before) && state(item.after)))
  };
  for (const [key,valid] of Object.entries(maps)) if (value[key] !== undefined && !record(value[key],valid)) return false;
  if (value.mode !== undefined && typeof value.mode !== 'string') return false;
  for (const key of ['owned','perday']) if(value[key] !== undefined && !(typeof value[key]==='number' && Number.isFinite(value[key]) && value[key]>=0))return false;
  for (const key of ['erdaRequest','hideDone','includeJanus']) if(value[key] !== undefined && typeof value[key] !== 'boolean')return false;
  if(value.epicDungeon !== undefined && !Object.hasOwn(DUNGEON_WEEKLY_FRAGMENTS,value.epicDungeon))return false;
  return Object.keys(value).every(safeKey);
}

// Compare JSON values rather than property order. Missing saves are distinct
// from an explicitly saved empty record, so external Reset is detected.
const canonical=value=>JSON.stringify(value,(_key,item)=>object(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const sameRaw=(a,b)=>{if(a===b)return true;if(a==null||b==null)return false;try{return canonical(JSON.parse(a))===canonical(JSON.parse(b));}catch{return false;}};

export function createPlayerStorage(getStorage, onStatus = () => {}, withLock = operation => operation()) {
  const sessions=new Map();
  let pending=Promise.resolve();
  const report=entry=>onStatus({key:entry.key,reason:entry.reason});
  const access=operation=>{try{return {ok:true,value:operation(getStorage())};}catch{return {ok:false};}};
  function read(key) {
    const cached=sessions.get(key);
    if(cached){check(key);report(cached);return structuredClone(cached.value);}
    const result=access(storage=>storage.getItem(key));
    let value={},reason='',raw=result.value;
    if(!result.ok)reason='unreadable';
    else if(raw!==null) {
      try{const parsed=JSON.parse(raw);if(!validatePlayerSave(parsed))throw new Error();value=parsed;}
      catch{reason='damaged';}
    }
    const entry={key,value,raw,reason,protected:!!reason};sessions.set(key,entry);report(entry);
    return structuredClone(value);
  }
  function check(key) {
    const entry=sessions.get(key);if(!entry)return true;
    if(entry.reason==='conflict')return false;
    if(entry.protected)return true;
    const latest=access(storage=>storage.getItem(key));
    if(!latest.ok){entry.reason='unsaved';report(entry);return false;}
    if(!sameRaw(latest.value,entry.raw)) {entry.reason='conflict';report(entry);return false;}
    return true;
  }
  function run(keys,operation) {
    let result;
    try{result=withLock(operation);}catch{result=false;}
    const failed=()=>{for(const key of keys){const entry=sessions.get(key);if(entry && entry.reason!=='conflict' && !entry.protected){entry.reason='unsaved';report(entry);}}return false;};
    if(result?.then) {
      const job=Promise.resolve(result).catch(failed);
      pending=Promise.all([pending,job]).then(()=>undefined);
      return job;
    }
    if(result===false)failed();
    return result;
  }
  function write(key,value) {
    if(!sessions.has(key))read(key);
    const entry=sessions.get(key);
    if(!check(key)){if(entry.reason!=='conflict')entry.value=structuredClone(value);report(entry);return false;}
    entry.value=structuredClone(value);
    if(entry.protected){report(entry);return false;}
    if(!validatePlayerSave(value)){entry.reason='unsaved';report(entry);return false;}
    const raw=JSON.stringify(value);
    return run([key],()=>{
      if(!check(key))return false;
      const result=access(storage=>storage.setItem(key,raw));
      if(result.ok)entry.raw=raw;
      entry.reason=result.ok?'':'unsaved';report(entry);return result.ok;
    });
  }
  function remove(key) {
    if(!sessions.has(key))read(key);
    const entry=sessions.get(key);
    if(!check(key))return false;
    // Preserve unreadable/damaged raw records under the existing Reset policy.
    if(entry.protected){entry.value={};report(entry);return false;}
    return run([key],()=>{
      if(!check(key))return false;
      const result=access(storage=>storage.removeItem(key));
      entry.value={};if(result.ok)entry.raw=null;
      entry.reason=result.ok?'':'unsaved';report(entry);return result.ok;
    });
  }
  function replaceMany(values,beforeReplace=()=>true,guardKeys=Object.keys(values)) {
    const pairs=Object.entries(values).map(([key,value])=>[key,structuredClone(value)]);
    if(!pairs.length||pairs.some(([,value])=>!validatePlayerSave(value)))return false;
    for(const key of guardKeys)if(!sessions.has(key))read(key);
    return run(guardKeys,()=>{
      if(guardKeys.some(key=>!check(key)||sessions.get(key).protected))return false;
      if(!beforeReplace())return false;
      const before=new Map();
      for(const [key] of pairs) {
        const raw=access(storage=>storage.getItem(key));if(!raw.ok)return false;
        before.set(key,{raw:raw.value,entry:structuredClone(sessions.get(key))});
      }
      const written=[];
      for(const [key,value] of pairs) {
        const result=access(storage=>storage.setItem(key,JSON.stringify(value)));
        if(!result.ok) {
          for(const rollbackKey of written.reverse()) {
            const prior=before.get(rollbackKey).raw;
            access(storage=>prior===null?storage.removeItem(rollbackKey):storage.setItem(rollbackKey,prior));
          }
          for(const [restoreKey,{entry}] of before)sessions.set(restoreKey,entry);
          const failed=sessions.get(key);failed.reason='unsaved';report(failed);return false;
        }
        written.push(key);
      }
      for(const [key,value] of pairs) {
        const entry=sessions.get(key);entry.value=value;entry.raw=JSON.stringify(value);entry.reason='';entry.protected=false;report(entry);
      }
      return true;
    });
  }
  function adopt(key,confirmReplacement=()=>true) {
    if(!sessions.has(key))read(key);
    return run([key],()=>{
      const entry=sessions.get(key),latest=access(storage=>storage.getItem(key));
      if(!latest.ok){entry.reason='conflict';report(entry);return false;}
      let value={};
      try{if(latest.value!==null){value=JSON.parse(latest.value);if(!validatePlayerSave(value))throw new Error();}}
      catch{entry.reason='conflict';report(entry);return false;}
      if(!confirmReplacement(structuredClone(value)))return false;
      entry.raw=latest.value;entry.value=value;entry.reason='';entry.protected=false;report(entry);return true;
    });
  }
  function continueSave(key,value,confirmReplacement=()=>true) {
    if(!sessions.has(key))read(key);
    const progress=structuredClone(value);
    if(!validatePlayerSave(progress))return false;
    return run([key],()=>{
      const entry=sessions.get(key),latest=access(storage=>storage.getItem(key));
      // This is an explicit conflict choice, never a bypass of damaged-record
      // protection or a silent overwrite during an ordinary write/import.
      if(entry.protected || entry.reason!=='conflict' || !latest.ok)return false;
      try{if(latest.value!==null && !validatePlayerSave(JSON.parse(latest.value)))return false;}
      catch{return false;}
      if(!confirmReplacement())return false;
      const raw=JSON.stringify(progress),result=access(storage=>storage.setItem(key,raw));
      if(!result.ok){report(entry);return false;}
      entry.raw=raw;entry.value=progress;entry.reason='';report(entry);return true;
    });
  }
  return {read,write,remove,replaceMany,check,adopt,continueSave,
    flush:()=>pending,
    conflict:key=>sessions.get(key)?.reason==='conflict',
    session:key=>structuredClone(sessions.get(key)?.value ?? read(key)),
    canBackup:key=>{if(!sessions.has(key))read(key);return check(key)&&!sessions.get(key).protected;},
    readPreference:key=>access(storage=>storage.getItem(key)).value ?? null,
    writePreference:(key,value)=>access(storage=>storage.setItem(key,value)).ok};
}
