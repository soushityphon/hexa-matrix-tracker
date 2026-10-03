import assert from 'node:assert/strict';
import {previewCatalog} from '../preview-priorities.js';
import {priorityGroups} from '../admin-panel-model.js';

for(const job of ['호영','렌']) {
  const prefix=job==='렌'?'ren_':'';
  const pairs=[['old','2026-10-01T02:00:00.000Z','GMS'],['release','2026-10-01T06:00:00.000Z','KMS'],['balance','2026-10-02T16:00:00.000Z','KMS']];
  const rows=pairs.flatMap(([id,createdAt,region])=>['heroic','interactive'].map(world=>({job,mode:`${id}_${world}`,pairId:id,pairName:id,sourceRegion:region,name:`${id} ${world}`,createdAt,sourceMode:`${prefix}${job==='렌'?region.toLowerCase():region==='GMS'?'lotus':'taotie'}_${world}`,enabled:true,steps:[{skill:'test',level:1}]})));
  // Different DB return orders must produce the same grouped dropdown order.
  for(const shuffled of [rows,rows.toReversed(),[rows[2],rows[5],rows[0],rows[3],rows[1],rows[4]]]) {
    const drafts=Object.fromEntries(shuffled.map(d=>[d.mode,d]));const before=JSON.stringify(drafts);
    const catalog=previewCatalog(drafts);
    const available=Object.keys(catalog.priorities).filter(mode=>catalog.priorities[mode].length&&catalog.settings[mode].enabled);
    const updates=new Map(available.map(mode=>[catalog.settings[mode].selectionId,catalog.settings[mode].selectionName]));
    assert.deepEqual([...updates.keys()],['old','release','balance']);
    for(const world of ['heroic','interactive'])assert.deepEqual(available.filter(mode=>catalog.settings[mode].world===world).map(mode=>catalog.settings[mode].selectionId),['old','release','balance']);
    assert.deepEqual(priorityGroups(drafts).map(g=>g.id),['balance','release','old']);
    assert.equal(JSON.stringify(drafts),before,'Sorting must not mutate saved drafts');
  }
  const ties=rows.slice(0,4).map(d=>({...d,createdAt:'2026-10-01T00:00:00Z'}));
  assert.deepEqual(Object.keys(previewCatalog(Object.fromEntries(ties.map(d=>[d.mode,d]))).priorities),Object.keys(previewCatalog(Object.fromEntries(ties.toReversed().map(d=>[d.mode,d]))).priorities));
}
const legacy={later:{mode:'taotie_heroic',sourceMode:'taotie_heroic',name:'later',source:'captured 2026-10-02',enabled:true,steps:[{}]},earlier:{mode:'lotus_heroic',sourceMode:'lotus_heroic',name:'earlier',source:'captured 2026-10-01',enabled:true,steps:[{}]}};
assert.deepEqual(Object.keys(previewCatalog(legacy).priorities),['lotus_heroic','taotie_heroic']);
console.log('Public update options oldest first for both classes/worlds, arbitrary DB order, ties and legacy dates; Admin newest first and records untouched.');
