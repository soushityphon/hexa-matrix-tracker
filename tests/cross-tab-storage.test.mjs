import assert from 'node:assert/strict';
import {createPlayerStorage} from '../player-storage.js';
const hy='hexa-tracker-hoyoung-v1',ren='hexa-tracker-ren-v1';
const records=new Map([[hy,JSON.stringify({levels:{Harmony:1},owned:42})],[ren,JSON.stringify({owned:7})]]);
const storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)};
let queue=Promise.resolve();
const lock=operation=>{const job=queue.then(operation);queue=job.catch(()=>{});return job;};
const a=createPlayerStorage(()=>storage,()=>{},lock),b=createPlayerStorage(()=>storage,()=>{},lock);
a.read(hy);b.read(hy);a.read(ren);b.read(ren);
const first=a.write(hy,{levels:{Harmony:2},owned:42});
const second=b.write(hy,{levels:{Harmony:3},owned:42});
assert.equal(await first,true);assert.equal(await second,false);
assert.equal(JSON.parse(records.get(hy)).levels.Harmony,2);assert.equal(b.conflict(hy),true);
assert.equal(b.session(hy).levels.Harmony,3,'losing tab keeps its local attempt');
assert.equal(await b.remove(hy),false);assert.equal(await b.replaceMany({[hy]:{}}),false);
assert.equal(b.canBackup(hy),false);assert.equal(b.canRecover(hy),true);
assert.equal(await b.adopt(hy,()=>false),false);assert.equal(b.conflict(hy),true);
assert.equal(await b.adopt(hy),true);assert.equal(b.read(hy).levels.Harmony,2);
assert.equal(b.conflict(hy),false);
assert.equal(await b.write(ren,{owned:8}),true);assert.equal(a.check(hy),true);
assert.equal(a.check(ren),false);assert.equal(a.conflict(ren),true);
// Formatting/order alone is not a conflict.
records.set(hy,'{ "owned":42, "levels":{"Harmony":2}}');assert.equal(a.check(hy),true);
// Storage removal and malformed external records remain protected.
records.delete(hy);assert.equal(a.check(hy),false);assert.equal(await a.adopt(hy),true);assert.deepEqual(a.read(hy),{});
records.set(hy,'42');assert.equal(a.check(hy),false);assert.equal(await a.adopt(hy),false);assert.equal(records.get(hy),'42');assert.deepEqual(a.session(hy),{});
assert.equal(await a.write(hy,{owned:9}),false);
// Delayed imports revalidate ALL safety-backup classes in the lock, before download.
records.set(hy,JSON.stringify({owned:1}));records.set(ren,JSON.stringify({owned:1}));
const c=createPlayerStorage(()=>storage,()=>{},lock);c.read(hy);c.read(ren);
let download=0;const imported=c.replaceMany({[hy]:{owned:9}},()=>{download++;return true;},[hy,ren]);
records.set(ren,JSON.stringify({owned:2}));
assert.equal(await imported,false);assert.equal(download,0);assert.equal(JSON.parse(records.get(hy)).owned,1);
// Even if no storage event/focus was delivered, pre-write checks catch changes.
const d=createPlayerStorage(()=>storage,()=>{},lock);d.read(hy);
records.set(hy,JSON.stringify({owned:4}));assert.equal(await d.write(hy,{owned:5}),false);assert.equal(JSON.parse(records.get(hy)).owned,4);
// Unsupported/rejected locks never fall back to an unsafe write.
const rejected=createPlayerStorage(()=>storage,()=>{},()=>Promise.reject(Error('unavailable')));rejected.read(hy);
assert.equal(await rejected.write(hy,{owned:6}),false);assert.equal(JSON.parse(records.get(hy)).owned,4);assert.equal(rejected.session(hy).owned,6);
await rejected.flush();
// A read failure after a good load still retains unsaved edits across classes.
let blocked=false;const transient=createPlayerStorage(()=>({...storage,getItem:key=>{if(blocked)throw Error('blocked');return storage.getItem(key);}}));
transient.read(hy);blocked=true;assert.equal(transient.write(hy,{owned:12}),false);assert.equal(transient.session(hy).owned,12);
blocked=false;assert.equal(transient.read(hy).owned,12);
// A queue of simultaneous stale tabs has one winner, rather than last-write-wins.
records.set(hy,JSON.stringify({owned:0}));
const tabs=Array.from({length:20},()=>createPlayerStorage(()=>storage,()=>{},lock));tabs.forEach(tab=>tab.read(hy));
const results=await Promise.all(tabs.map((tab,index)=>tab.write(hy,{owned:index+1})));
assert.equal(results.filter(Boolean).length,1);assert.equal(JSON.parse(records.get(hy)).owned,1);
console.log('Cross-tab storage: serialised writes, conflicts, recovery, class isolation, removal and import races pass');
