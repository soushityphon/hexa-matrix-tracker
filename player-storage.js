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

export function createPlayerStorage(getStorage, onStatus = () => {}) {
  const sessions=new Map();
  const report=entry=>onStatus({key:entry.key,reason:entry.reason});
  const access = operation => {try{return {ok:true,value:operation(getStorage())};}catch{return {ok:false};}};
  function read(key) {
    const cached=sessions.get(key);
    if(cached){report(cached);return structuredClone(cached.value);}
    const result=access(storage=>storage.getItem(key));
    let value={},reason='',raw=result.value;
    if(!result.ok)reason='unreadable';
    else if(raw !== null) {
      try{const parsed=JSON.parse(raw);if(!validatePlayerSave(parsed))throw new Error();value=parsed;}
      catch{reason='damaged';}
    }
    const entry={key,value,raw,reason,protected:!!reason};sessions.set(key,entry);report(entry);
    return structuredClone(value);
  }
  function write(key,value) {
    if(!sessions.has(key))read(key);
    const entry=sessions.get(key);entry.value=structuredClone(value);
    if(entry.protected){report(entry);return false;}
    if(!validatePlayerSave(value)){entry.reason='unsaved';report(entry);return false;}
    const result=access(storage=>storage.setItem(key,JSON.stringify(value)));
    entry.reason=result.ok?'':'unsaved';report(entry);return result.ok;
  }
  function remove(key) {
    if(!sessions.has(key))read(key);
    const entry=sessions.get(key);
    // A reset must never discard the only copy of an unreadable/damaged save.
    if(entry.protected){entry.value={};report(entry);return false;}
    const result=access(storage=>storage.removeItem(key));
    entry.value={};entry.reason=result.ok?'':'unsaved';report(entry);return result.ok;
  }
  function replaceMany(values) {
    const pairs=Object.entries(values);
    if(!pairs.length||pairs.some(([,value])=>!validatePlayerSave(value)))return false;
    for(const [key] of pairs)if(!sessions.has(key))read(key);
    if(pairs.some(([key])=>sessions.get(key).protected))return false;
    const before=new Map();
    for(const [key] of pairs) {
      const raw=access(storage=>storage.getItem(key));
      if(!raw.ok)return false;
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
        const failed=sessions.get(key);failed.reason='unsaved';report(failed);
        return false;
      }
      written.push(key);
    }
    for(const [key,value] of pairs) {
      const entry=sessions.get(key);entry.value=structuredClone(value);entry.raw=JSON.stringify(value);entry.reason='';entry.protected=false;report(entry);
    }
    return true;
  }
  return {read,write,remove,replaceMany,
    canBackup:key=>{if(!sessions.has(key))read(key);return !sessions.get(key).protected;},
    readPreference:key=>access(storage=>storage.getItem(key)).value ?? null,
    writePreference:(key,value)=>access(storage=>storage.setItem(key,value)).ok};
}
