import { COSTS, NODES, PRIORITIES, PRIORITY_SETTINGS } from './data.js';

let runtimeNodes = NODES;
let configuredCatalogue = false;
let byShort = Object.fromEntries(NODES.map(node => [node.short, node]));
export function setTrackerCatalogue(nodes) {
  configuredCatalogue = true; runtimeNodes = nodes; byShort = Object.fromEntries(nodes.map(node=>[node.short,node]));
}
// Unlock costs: https://maplestorywiki.net/w/HEXA_Matrix#HEXA_Stats
export const STAT_UNLOCK_COSTS = {
  'HEXA Stat I': { erda: 5, frags: 10 },
  'HEXA Stat II': { erda: 10, frags: 200 },
  'HEXA Stat III': { erda: 15, frags: 350 }
};
const isStatUnlocked = (skill, levels, unlocked) => (levels[skill] || 0) > 0 || !!unlocked[skill];
export function statRemainingCost(skill, levels, unlocked = {}) {
  const unlock = STAT_UNLOCK_COSTS[skill];
  if (!unlock) throw new Error(`Unknown HEXA Stat unlock cost: ${skill}`);
  return { erda: isStatUnlocked(skill, levels, unlocked) ? 0 : unlock.erda,
    frags: isStatUnlocked(skill, levels, unlocked) ? 0 : unlock.frags, rng: true };
}
export const priorityPatch = mode => PRIORITY_SETTINGS[mode]?.patch || mode.split('_')[0];
export function activeNodes(mode) {
  if (configuredCatalogue) return runtimeNodes;
  const patch = priorityPatch(mode);
  return runtimeNodes.filter(node => (patch === 'taotie' || node.short !== 'Taotie') && (patch !== 'hecate' || node.short !== 'Lotus'));
}

export function rangeCost(skill, from, to) {
  const node = byShort[skill];
  if (!node) return null;
  const result = { erda: 0, frags: 0 };
  for (let level = from + 1; level <= to; level++) {
    const cost = node.costs ? node.costs[level - 1] : configuredCatalogue ? undefined : COSTS[node.type]?.[level - 1];
    if (!cost) throw new Error(`Missing cost for ${node.type} level ${level}`);
    result.erda += cost.erda;
    result.frags += cost.frags;
  }
  return result;
}

export function matrixTotals(levels, mode, includeJanus = false, unlocked = {}, order = PRIORITIES[mode] || []) {
  const spent = { erda: 0, frags: 0 };
  const remaining = { erda: 0, frags: 0 };
  const total = { erda: 0, frags: 0 };
  for (const node of activeNodes(mode)) {
    if (node.short === 'Janus' && !includeJanus) continue;
    const initial = node.initialLevel ?? (node.short === 'Apotheosis' ? 1 : 0);
    const current = Math.max(initial, levels[node.short] || 0);
    for (const [target, cost] of [
      [spent, rangeCost(node.short, initial, current)],
      [remaining, rangeCost(node.short, current, 30)],
      [total, rangeCost(node.short, initial, 30)]
    ]) {
      target.erda += cost.erda;
      target.frags += cost.frags;
    }
  }
  const percent = total.frags ? spent.frags / total.frags * 100 : 0;
  for (const skill of new Set(order.map(step => step.skill).filter(skill => skill.startsWith('HEXA Stat')))) {
    const cost = STAT_UNLOCK_COSTS[skill];
    if (!cost) throw new Error(`Unknown HEXA Stat unlock cost: ${skill}`);
    const target = isStatUnlocked(skill, levels, unlocked) ? spent : remaining;
    target.erda += cost.erda;
    target.frags += cost.frags;
    total.erda += cost.erda;
    total.frags += cost.frags;
  }
  return { spent, remaining, total, percent };
}

export function nextCheckpoint(levels, mode, steps = PRIORITIES[mode]) {
  const index = steps.findIndex(step => (levels[step.skill] || 0) < step.level);
  const completed = steps.filter(step => (levels[step.skill] || 0) >= step.level).length;
  return { steps, index: index < 0 ? steps.length : index, completed, next: index < 0 ? null : steps[index] };
}

export function priorityRows(levels, mode, order = PRIORITIES[mode], unlocked = {}) {
  const previous = { ...levels };
  const seenStats = new Set();
  return order.map((step, index) => {
    const from = previous[step.skill] || 0;
    const done = (levels[step.skill] || 0) >= step.level;
    const cost = step.skill.startsWith('HEXA Stat')
      ? statRemainingCost(step.skill, levels, { ...unlocked, [step.skill]: !!unlocked[step.skill] || seenStats.has(step.skill) })
      : rangeCost(step.skill, Math.min(from, step.level), step.level);
    if (step.skill.startsWith('HEXA Stat')) seenStats.add(step.skill);
    previous[step.skill] = Math.max(from, step.level);
    return { ...step, index: index + 1, from, done, cost };
  });
}

// Shared grouping for the list and infographic. Completed rows remain in the
// full view, but do not interrupt a run of remaining upgrades for one skill.
// Groups keep source rows intact so displays can use their stable endpoint IDs.
export function priorityCheckpointGroups(rows) {
  const groups=[];
  let lastUnmet=null;
  for(const row of rows) {
    if(row.done) {groups.push([row]);continue;}
    if(lastUnmet?.[0].skill===row.skill)lastUnmet.push(row);
    else {lastUnmet=[row];groups.push(lastUnmet);}
  }
  return groups;
}

export function displayPriorityRows(levels, mode, order = PRIORITIES[mode], unlocked = {}) {
  const rows = priorityRows(levels, mode, order, unlocked);
  return priorityCheckpointGroups(rows).map(group=>{
    const first=group[0],last=group.at(-1);
    return {...first,level:last.level,endIndex:last.index,
      cost:first.done || first.cost.rng ? first.cost : rangeCost(first.skill,levels[first.skill] || 0,last.level)};
  });
}

// Compound source transitions. Within a partially completed transition,
// estimate the remaining logarithmic gain by its share of Fragment cost.
// This is a display estimate, not a measured per-level FD value.
export function combinedSourceGain(order, row, currentLevel) {
  const start = Math.max(row.from, currentLevel);
  if (start >= row.level) return null;
  let from = start;
  let multiplier = 1;
  let estimated = false;
  for (const step of order.slice(row.index - 1, row.endIndex)) {
    if (step.skill !== row.skill || step.level <= start) continue;
    // Older Scouter captures marked the first Origin transition as 0→N even
    // though Apotheosis starts at 1. Ignore its free unlock in FD cost shares.
    const sourceFrom = step.skill === 'Apotheosis' ? Math.max(1, step.fdFrom) : step.fdFrom;
    if (!Number.isFinite(step.fdGain) || !Number.isInteger(step.fdFrom) || sourceFrom > from) return null;
    let share = 1;
    if (sourceFrom < from) {
      const full = rangeCost(step.skill, sourceFrom, step.level);
      const remaining = rangeCost(step.skill, from, step.level);
      if (!full?.frags || !remaining?.frags) return null;
      share = remaining.frags / full.frags;
      estimated = true;
    }
    multiplier *= (1 + step.fdGain / 100) ** share;
    from = step.level;
  }
  return from === row.level ? { gain: (multiplier - 1) * 100, estimated } : null;
}
