import assert from 'node:assert/strict';
import { createPlayerStorage,validatePlayerSave } from '../player-storage.js';
const key='hexa-tracker-hoyoung-v1';
const records=new Map();let failRead=false,failWrite=false,failRemove=false,status;
const storage={getItem:k=>{if(failRead)throw Error();return records.get(k) ?? null;},setItem:(k,v)=>{if(failWrite)throw Error();records.set(k,v);},removeItem:k=>{if(failRemove)throw Error();records.delete(k);}};
const make=()=>createPlayerStorage(()=>storage,s=>status=s);
const legacy={levels:{Harmony:14,'HEXA Stat I':12,Hidden:29},statUnlocked:{'HEXA Stat II':true},owned:60,perday:0,erdaRequest:true,epicDungeon:'nightmareParadise',hideDone:false,includeJanus:true};
records.set(key,JSON.stringify(legacy));let saves=make();assert.deepEqual(saves.read(key),legacy);
const current={...legacy,statLines:{'HEXA Stat I':[null,2,null]},statCompleted:{'HEXA Stat I':true},infographicUndo:{mode:{sequence:'s',skills:{node:[{key:'k',skill:'Harmony',before:{level:7},after:{level:14}}]}}}};
assert.equal(validatePlayerSave(current),true);assert.equal(saves.write(key,current),true);assert.deepEqual(make().read(key),current);
failWrite=true;const edited={...current,owned:72};assert.equal(saves.write(key,edited),false);assert.equal(status.reason,'unsaved');assert.deepEqual(saves.read(key),edited);assert.deepEqual(JSON.parse(records.get(key)),current);
// Session progress survives a different class read and returning.
saves.read('hexa-tracker-ren-v1');assert.deepEqual(saves.read(key),edited);
failWrite=false;assert.equal(saves.write(key,edited),true);assert.equal(status.reason,'');
failRemove=true;assert.equal(saves.remove(key),false);assert.equal(status.reason,'unsaved');assert.equal(records.has(key),true);failRemove=false;assert.equal(saves.write(key,{}),true);
for(const raw of ['42','null','[]','{bad',JSON.stringify({levels:[]}),JSON.stringify({levels:{Harmony:31}}),JSON.stringify({statLines:{x:[10,10,10]}}),JSON.stringify({infographicUndo:{x:{sequence:'s',skills:{x:[null]}}}}),JSON.stringify({epicDungeon:'unknown'})]){
 records.set(key,raw);saves=make();assert.deepEqual(saves.read(key),{});assert.equal(status.reason,'damaged');assert.equal(saves.write(key,{levels:{Harmony:1}}),false);assert.equal(saves.remove(key),false);assert.equal(records.get(key),raw);
}
failRead=true;saves=make();assert.deepEqual(saves.read(key),{});assert.equal(status.reason,'unreadable');failRead=false;assert.equal(saves.write(key,edited),false);assert.equal(status.reason,'unreadable');
// Multi-class replacement validates first and rolls back earlier writes if a later write fails.
failRead=false;failWrite=false;failRemove=false;records.clear();saves=make();
records.set(key,JSON.stringify({levels:{Harmony:1}}));records.set('hexa-tracker-ren-v1',JSON.stringify({levels:{RenSkill:2}}));
saves.read(key);saves.read('hexa-tracker-ren-v1');
assert.equal(saves.replaceMany({[key]:{levels:{Harmony:3}},'hexa-tracker-ren-v1':{levels:{RenSkill:4}}}),true);
assert.equal(JSON.parse(records.get(key)).levels.Harmony,3);assert.equal(JSON.parse(records.get('hexa-tracker-ren-v1')).levels.RenSkill,4);
assert.equal(saves.replaceMany({[key]:{levels:{Harmony:31}}}),false);assert.equal(JSON.parse(records.get(key)).levels.Harmony,3);
const before=new Map(records);let writes=0;
const limited={...storage,setItem:(k,v)=>{if(++writes===2)throw Error('quota');records.set(k,v);}};
const guarded=createPlayerStorage(()=>limited);
assert.equal(guarded.replaceMany({[key]:{levels:{Harmony:9}},'hexa-tracker-ren-v1':{levels:{RenSkill:8}}}),false);
assert.deepEqual(records,before);
records.set('damaged','42');assert.equal(guarded.canBackup('damaged'),false);
assert.equal(guarded.canBackup(key),true);
assert.equal(createPlayerStorage(()=>{throw Error();}).writePreference('pref','x'),false);
console.log('Player storage legacy/current, damaged records, exceptions and session recovery pass');

// Identical values, including reordered keys, do not touch persisted bytes.
records.clear();records.set(key,JSON.stringify({levels:{Harmony:2},owned:42}));
let identicalWrites=0;
const measured=createPlayerStorage(()=>({...storage,setItem:(k,v)=>{identicalWrites++;storage.setItem(k,v);}}));
measured.read(key);
assert.equal(measured.write(key,{owned:42,levels:{Harmony:2}}),true);
assert.equal(identicalWrites,0);
assert.equal(records.get(key),JSON.stringify({levels:{Harmony:2},owned:42}));
failWrite=true;assert.equal(measured.write(key,{owned:43,levels:{Harmony:2}}),false);
assert.equal(measured.session(key).owned,43);
failWrite=false;assert.equal(measured.write(key,{owned:43,levels:{Harmony:2}}),true);
assert.equal(identicalWrites,2,'a failed real write is retried');
assert.equal(measured.write(key,{levels:{Harmony:2},owned:43}),true);
assert.equal(identicalWrites,2);
records.delete(key);
assert.equal(measured.write(key,{owned:43,levels:{Harmony:2}}),false,'no-op cannot bypass external Reset');
console.log('Identical player saves skip writes; real failed saves retry and peer removal stays protected');
