import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateDraft } from '../priority-draft.js';

const draftPath = process.argv[2];
if (!draftPath) throw new Error('Usage: node scripts/apply-priority-draft.mjs draft.json');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = resolve(root, 'data.js');
const draft = validateDraft(JSON.parse(readFileSync(draftPath, 'utf8')));
let source = readFileSync(dataPath, 'utf8');

function replaceLiteral(prefix, after, update) {
  const start = source.indexOf(prefix);
  if (start < 0) throw new Error(`Missing ${prefix}`);
  const contentStart = start + prefix.length;
  const end = source.indexOf(after, contentStart);
  if (end < 0) throw new Error(`Missing end marker for ${prefix}`);
  const value = JSON.parse(source.slice(contentStart, end));
  const next = update(value);
  source = source.slice(0, contentStart) + JSON.stringify(next) + source.slice(end);
}
replaceLiteral('export const NODES=', ';\nconst mk=', nodes => {
  const updated = nodes.map(node => ({ ...node, name: draft.names[node.short] }));
  for (const node of draft.newNodes) {
    const last = updated.findLastIndex(existing => existing.group === node.group);
    updated.splice(last + 1, 0, node);
  }
  return updated;
});
replaceLiteral('const rawPriorities=', ';\nexport const PRIORITIES=', priorities => {
  priorities[draft.mode] = draft.steps.map(({ skill, level }) => [skill, level]);
  return priorities;
});
for (const [prefix, value] of [
  ['export const PRIORITY_LABELS=', draft.name],
  ['export const PRIORITY_SOURCES=', draft.source]
]) {
  const start = source.indexOf(prefix);
  const end = source.indexOf(';', start);
  if (start < 0 || end < 0) throw new Error(`Missing ${prefix}`);
  const raw = source.slice(start + prefix.length, end);
  const object = JSON.parse(raw);
  object[draft.mode] = value;
  source = source.slice(0, start + prefix.length) + JSON.stringify(object) + source.slice(end);
}
replaceLiteral('export const PRIORITY_SETTINGS=', ';', settings => {
  settings[draft.mode] = {
    ...settings[draft.sourceMode],
    enabled: draft.enabled
  };
  return settings;
});
writeFileSync(dataPath, source);
console.log(`Applied ${draft.name}: ${draft.steps.length} steps`);
