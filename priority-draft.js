import { NODES, PRIORITIES, PRIORITY_LABELS, PRIORITY_SOURCES } from './data.js';

const byShort = new Map(NODES.map(node => [node.short, node]));
const statNames = new Set(['HEXA Stat I', 'HEXA Stat II', 'HEXA Stat III']);

export function parseSteps(text, extraSkills = []) {
  const seen = new Map();
  const extra = new Set(extraSkills);
  return text.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.+?)\s*[,\t]\s*(\d+)$/);
    if (!match) throw new Error(`Line ${index + 1}: use Skill, level`);
    const skill = match[1].trim();
    const level = Number(match[2]);
    if (!byShort.has(skill) && !extra.has(skill) && !statNames.has(skill)) throw new Error(`Line ${index + 1}: unknown skill ${skill}`);
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
  const types = new Set(['Skill', 'Skill II', 'Mastery', 'V', 'Common', 'Common II']);
  const groups = { Skill: 'Skill Nodes', 'Skill II': 'Skill Nodes', Mastery: 'Mastery Nodes', V: 'Enhancement Nodes', Common: 'Common Nodes', 'Common II': 'Common Nodes' };
  const newNodes = (draft.newNodes || []).map(node => {
    if (!node || !node.short?.trim() || !node.name?.trim() || !types.has(node.type) || !/^https:\/\/maplescouter\.com\/hexaskill\/[\w/.-]+\.png$/.test(node.icon)) {
      throw new Error('Each new skill needs a short label, display name, type and Maple Scouter image');
    }
    const id = node.short.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!id) throw new Error('Use a short label with Latin letters or numbers');
    return { id, short: node.short.trim(), name: node.name.trim(), type: node.type, group: groups[node.type], icon: node.icon, sourceName: String(node.sourceName || ''), coreId: String(node.coreId || '') };
  });
  const shorts = newNodes.map(node => node.short);
  if (new Set(shorts).size !== shorts.length || new Set(newNodes.map(node => node.id)).size !== newNodes.length || shorts.some(short => byShort.has(short) || statNames.has(short)) || newNodes.some(node => NODES.some(existing => existing.id === node.id))) throw new Error('New skill short labels must be unique');
  const steps = parseSteps(draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n'), shorts);
  if (steps.some(step => step.skill === 'Taotie') && !draft.mode.startsWith('taotie_')) throw new Error('Taotie steps need the Taotie mode');
  if (steps.some(step => step.skill === 'Lotus') && draft.mode.startsWith('hecate_')) throw new Error('Lotus steps are not in the Hecate mode');
  const names = {};
  for (const node of NODES) {
    const name = draft.names?.[node.short];
    if (typeof name !== 'string' || !name.trim()) throw new Error(`Enter a display name for ${node.short}`);
    names[node.short] = name.trim();
  }
  return { schema: 2, mode: draft.mode, name: draft.name.trim(), source: String(draft.source || '').trim(), names, steps, newNodes };
}

export function currentDraft(mode) {
  return { schema: 2, mode, name: PRIORITY_LABELS[mode], source: PRIORITY_SOURCES[mode], names: Object.fromEntries(NODES.map(node => [node.short, node.name])), steps: PRIORITIES[mode], newNodes: [] };
}

export function compareDraft(draft) {
  const current = PRIORITIES[draft.mode];
  const changedNames = NODES.filter(node => draft.names[node.short] !== node.name).length;
  const changedSteps = draft.steps.filter((step, index) => step.skill !== current[index]?.skill || step.level !== current[index]?.level).length;
  return { changedNames, changedSteps, lengthDifference: draft.steps.length - current.length };
}
