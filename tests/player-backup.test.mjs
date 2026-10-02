import assert from 'node:assert/strict';
import {createPlayerBackup,parsePlayerBackup} from '../player-backup.js';

const models={
  hoyoung:{nodes:[{short:'Apotheosis',sourceKey:'Hoyeong_1'},{short:'Harmony',sourceKey:'Hoyeong_2'}],stats:[{short:'HEXA Stat I',sourceKey:'hexaStat1'}]},
  ren:{nodes:[{short:'Origin Ren',sourceKey:'Len_1'},{short:'Mastery Ren',sourceKey:'Len_2'}],stats:[{short:'HEXA Stat I',sourceKey:'hexaStat1'}]}
};
const classes={
  hoyoung:{levels:{Apotheosis:1,Harmony:14,'HEXA Stat I':12},statUnlocked:{'HEXA Stat I':true},statLines:{'HEXA Stat I':[8,2,2]},owned:50,perday:20,hideDone:true,infographicUndo:{x:{sequence:'old',skills:{}}}},
  ren:{levels:{'Origin Ren':3,'Mastery Ren':7},owned:4,perday:0,includeJanus:false}
};
const backup=createPlayerBackup(classes,models,'2026-10-02T00:00:00.000Z');
assert.equal(backup.format,'hexa-player-backup');assert.equal(backup.version,1);
assert.deepEqual(Object.keys(backup.classes),['Hoyeong','Len']);
assert.equal(backup.classes.Hoyeong.progress.levels.Hoyeong_2,14);
assert.equal(backup.classes.Len.progress.levels.Len_1,3);
assert.equal(backup.classes.Hoyeong.progress.levels.Apotheosis,undefined);
assert.equal(backup.classes.Hoyeong.progress.infographicUndo,undefined);
const restored=parsePlayerBackup(backup,models);
delete restored.hoyoung.infographicUndo;
const expected={...classes.hoyoung};delete expected.infographicUndo;assert.deepEqual(restored.hoyoung,expected);
const wrong=structuredClone(backup);wrong.classes.Other=wrong.classes.Len;assert.throws(()=>parsePlayerBackup(wrong,models));
const malformed=structuredClone(backup);malformed.classes.Len.progress.levels.Len_1=31;assert.throws(()=>parsePlayerBackup(malformed,models));
const stale=structuredClone(backup);stale.classes.Len.progress.infographicUndo={};assert.throws(()=>parsePlayerBackup(stale,models));
assert.throws(()=>createPlayerBackup({hoyoung:{levels:{Unknown:1}}},models));
console.log('Player backup source IDs, round trip, stale history removal and validation pass');
