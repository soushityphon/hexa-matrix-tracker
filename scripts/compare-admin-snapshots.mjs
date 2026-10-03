import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Read-only comparison of existing maintenance GET exports. Never rewrites,
// normalises or repairs stored JSON, including damaged historical records.
export function snapshotSummary(value) {
  if (value?.schema !== 1 || value.type !== 'hexa-tracker-backup') throw new Error('Unsupported Admin snapshot');
  const rows = {};
  for (const [table, columns] of [['priorities', ['mode', 'draft_json', 'updated_at']], ['skills', ['job', 'review_json', 'updated_at']]]) {
    if (!Array.isArray(value[table])) throw new Error('Invalid Admin snapshot rows');
    const keys = new Set();
    rows[table] = value[table].map(row => {
      if (!row || Object.keys(row).length !== columns.length || columns.some(c => typeof row[c] !== 'string')) throw new Error('Invalid Admin snapshot columns');
      if (!row[columns[0]] || keys.has(row[columns[0]])) throw new Error('Invalid or duplicate Admin snapshot key');
      keys.add(row[columns[0]]);
      return columns.map(c => row[c]);
    }).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  }
  return { priorities: rows.priorities.length, skills: rows.skills.length,
    sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
}

export function compareSnapshots(source, target) {
  const before = snapshotSummary(source), after = snapshotSummary(target);
  return { match: before.sha256 === after.sha256, source: before, target: after };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node scripts/compare-admin-snapshots.mjs SOURCE.json TARGET.json');
    const result = compareSnapshots(...process.argv.slice(2).map(file => JSON.parse(readFileSync(file, 'utf8'))));
    console.log(JSON.stringify(result, null, 2));
    if (!result.match) process.exitCode = 1;
  } catch {
    console.error('Admin snapshot comparison failed. Supply two valid maintenance GET exports. No data changed.');
    process.exitCode = 1;
  }
}
