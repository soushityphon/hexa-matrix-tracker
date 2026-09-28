import { NODES, PRIORITIES, PRIORITY_LABELS, PRIORITY_SOURCES } from './data.js';

const byShort = new Map(NODES.map(node => [node.short, node]));
const statNames = new Set(['HEXA Stat I', 'HEXA Stat II', 'HEXA Stat III']);

export function parseSteps(text) {
  const seen = new Map();
  return text.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.+?)\s*[,\t]\s*(\d+)$/);
    if (!match) throw new Error(`Line ${index + 1}: use Skill, level`);
    const skill = match[1].trim();
    const level = Number(match[2]);
    if (!byShort.has(skill) && !statNames.has(skill)) throw new Error(`Line ${index + 1}: unknown skill ${skill}`);
    const max = statNames.has(skill) ? 20 : 30;
    if (level < 1 || level > max) throw new Error(`Line ${index + 1}: ${skill} must be level 1 to ${max}`);
    if (statNames.has(skill) && level !== 20) throw new Error(`Line ${index + 1}: HEXA Stats use level 20 checkpoints`);
    if (level <= (seen.get(skill) || 0)) throw new Error(`Line ${index + 1}: ${skill} checkpoints must increase`);
    seen.set(skill, level);
    return { skill, level };
  }).filter(Boolean);
}

export function validateDraft(draft) {
  if (!draft || !Object.hasOwn(PRIORITIES, draft.mode)) throw new Error('Choose an existing priority mode');
  if (typeof draft.name !== 'string' || !draft.name.trim()) throw new Error('Enter a priority name');
  if (!Array.isArray(draft.steps) || !draft.steps.length) throw new Error('Enter at least one priority step');
  const steps = parseSteps(draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n'));
  if (steps.some(step => step.skill === 'Taotie') && !draft.mode.startsWith('taotie_')) throw new Error('Taotie steps need the Taotie mode');
  const names = {};
  for (const node of NODES) {
    const name = draft.names?.[node.short];
    if (typeof name !== 'string' || !name.trim()) throw new Error(`Enter a display name for ${node.short}`);
    names[node.short] = name.trim();
  }
  return { schema: 1, mode: draft.mode, name: draft.name.trim(), source: String(draft.source || '').trim(), names, steps };
}

export function currentDraft(mode) {
  return { schema: 1, mode, name: PRIORITY_LABELS[mode], source: PRIORITY_SOURCES[mode], names: Object.fromEntries(NODES.map(node => [node.short, node.name])), steps: PRIORITIES[mode] };
}

export function compareDraft(draft) {
  const current = PRIORITIES[draft.mode];
  const changedNames = NODES.filter(node => draft.names[node.short] !== node.name).length;
  const changedSteps = draft.steps.filter((step, index) => step.skill !== current[index]?.skill || step.level !== current[index]?.level).length;
  return { changedNames, changedSteps, lengthDifference: draft.steps.length - current.length };
}
