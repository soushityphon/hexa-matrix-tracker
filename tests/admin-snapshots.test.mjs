import assert from 'node:assert/strict';
import { compareSnapshots, snapshotSummary } from '../scripts/compare-admin-snapshots.mjs';

const source = { schema: 1, type: 'hexa-tracker-backup', createdAt: 'earlier',
  priorities: [{ mode: 'ren', draft_json: '{broken historical record', updated_at: 'revision-2' }, { mode: 'hy', draft_json: '{"captures":[1],"costs":[2],"fd":[3],"available":false}', updated_at: 'revision-1' }],
  skills: [{ job: 'Len', review_json: '{"helperText":"Future explanation","name":"Owner name","tag":"M1"}', updated_at: 'revision-3' }] };
const target = structuredClone(source);
target.createdAt = 'later'; target.priorities.reverse();
assert.equal(compareSnapshots(source, target).match, true);
assert.deepEqual(snapshotSummary(source), snapshotSummary(target));
for (const mutate of [
  x => x.skills[0].review_json = '{"helperText":"Changed"}',
  x => x.skills[0].updated_at = 'new-revision',
  x => x.priorities[0].draft_json += ' ',
  x => x.priorities.pop(),
  x => x.skills.pop()
]) { const changed = structuredClone(source); mutate(changed); assert.equal(compareSnapshots(source, changed).match, false); }
for (const mutate of [x => x.schema = 2, x => x.skills = null, x => x.skills.push(x.skills[0]), x => x.skills[0].updated_at = null, x => x.skills[0].extra = 'unreviewed-column']) {
  const invalid = structuredClone(source); mutate(invalid); assert.throws(() => snapshotSummary(invalid));
}
assert.equal(JSON.stringify(source).includes('Future explanation'), true);
assert.equal(source.priorities[0].draft_json, '{broken historical record');
console.log('Read-only Admin snapshot comparison preserves raw data and revisions; changes and invalid inputs refused.');
