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
assert.equal(createPlayerStorage(()=>{throw Error();}).writePreference('pref','x'),false);
console.log('Player storage legacy/current, damaged records, exceptions and session recovery pass');
