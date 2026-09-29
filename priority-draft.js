import { NODES, PRIORITIES, PRIORITY_LABELS, PRIORITY_SOURCES, PRIORITY_SETTINGS } from './data.js';

const byShort = new Map(NODES.map(node => [node.short, node]));
const statNames = new Set(['HEXA Stat I', 'HEXA Stat II', 'HEXA Stat III']);
const statIconPattern = /^https:\/\/open\.api\.nexon\.com\/static\/maplestory\/skill\/icon\/[A-Za-z0-9_-]+$/;

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
  if (!draft || !Object.hasOwn(PRIORITIES, draft.sourceMode || draft.mode)) throw new Error('Choose an existing source priority');
  if (draft.isNew && (Object.hasOwn(PRIORITIES, draft.mode) || !/^[a-z0-9_]+$/.test(draft.mode))) throw new Error('New priority ID is invalid or already exists');
  if (!draft.isNew && draft.mode !== (draft.sourceMode || draft.mode)) throw new Error('Existing priority ID does not match its source');
  if (typeof draft.name !== 'string' || !draft.name.trim()) throw new Error('Enter a priority name');
  if (!Array.isArray(draft.steps) || !draft.steps.length) throw new Error('Import an order before saving this priority');
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
  const statIcons = {};
  for (const [skill, icon] of Object.entries(draft.statIcons || {})) {
    if (!statNames.has(skill) || !statIconPattern.test(icon)) throw new Error(`Invalid HEXA Stat icon for ${skill}`);
    statIcons[skill] = icon;
  }
  const shorts = newNodes.map(node => node.short);
  if (new Set(shorts).size !== shorts.length || new Set(newNodes.map(node => node.id)).size !== newNodes.length || shorts.some(short => byShort.has(short) || statNames.has(short)) || newNodes.some(node => NODES.some(existing => existing.id === node.id))) throw new Error('New skill short labels must be unique');
  const steps = parseSteps(draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n'), shorts);
  for (let index = 0; index < steps.length; index++) {
    const { fdGain, fdFrom, sourceCost } = draft.steps[index];
    const previousLevel = steps.slice(0, index).reverse().find(step => step.skill === steps[index].skill)?.level || 0;
    if (sourceCost !== undefined) {
      if (statNames.has(steps[index].skill) || !sourceCost || sourceCost.from !== previousLevel ||
          !Number.isInteger(sourceCost.erda) || sourceCost.erda < 0 ||
          !Number.isInteger(sourceCost.frags) || sourceCost.frags < 0) {
        throw new Error(`Invalid Scouter transition cost at step ${index + 1}`);
      }
      steps[index] = { ...steps[index], sourceCost: { from: previousLevel, erda: sourceCost.erda, frags: sourceCost.frags } };
    }
    if (fdGain === undefined && fdFrom === undefined) continue;
    if (statNames.has(steps[index].skill) || !Number.isFinite(fdGain) || fdGain < 0 || !Number.isInteger(fdFrom) || fdFrom < 0 || fdFrom >= steps[index].level) throw new Error(`Invalid source FD at step ${index + 1}`);
    if (fdFrom !== previousLevel) throw new Error(`Source FD transition does not match step ${index + 1}`);
    steps[index] = { ...steps[index], fdFrom, fdGain };
  }
  const patch = PRIORITY_SETTINGS[draft.sourceMode || draft.mode].patch;
  if (steps.some(step => step.skill === 'Taotie') && patch !== 'taotie') throw new Error('Taotie steps need the Taotie patch');
  if (steps.some(step => step.skill === 'Lotus') && patch === 'hecate') throw new Error('Lotus steps are not in the Hecate patch');
  const names = {};
  const shortNames = {};
  for (const node of NODES) {
    const name = draft.names?.[node.short];
    if (typeof name !== 'string' || !name.trim()) throw new Error(`Enter a display name for ${node.short}`);
    names[node.short] = name.trim();
    // Older saved imports did not have a separate priority-list label.
    const shortName = draft.shortNames?.[node.short] ?? node.short;
    if (typeof shortName !== 'string' || !shortName.trim()) throw new Error(`Enter a short display name for ${node.short}`);
    shortNames[node.short] = shortName.trim();
  }
  return { schema: 4, mode: draft.mode, sourceMode: draft.sourceMode || draft.mode, isNew: draft.isNew === true, enabled: draft.enabled === true, name: draft.name.trim(), source: String(draft.source || '').trim(), names, shortNames, steps, newNodes, statIcons };
}

export function currentDraft(mode) {
  return { schema: 4, mode, sourceMode: mode, isNew: false, enabled: PRIORITY_SETTINGS[mode].enabled, name: PRIORITY_LABELS[mode], source: PRIORITY_SOURCES[mode], names: Object.fromEntries(NODES.map(node => [node.short, node.name])), shortNames: Object.fromEntries(NODES.map(node => [node.short, node.short])), steps: PRIORITIES[mode], newNodes: [], statIcons: {} };
}

export function compareDraft(draft, current = PRIORITIES[draft.sourceMode || draft.mode] || []) {
  const changedNames = NODES.filter(node => draft.names[node.short] !== node.name || (draft.shortNames?.[node.short] ?? node.short) !== node.short).length;
  const changedSteps = draft.steps.filter((step, index) => step.skill !== current[index]?.skill || step.level !== current[index]?.level).length;
  return { changedNames, changedSteps, lengthDifference: draft.steps.length - current.length };
}
