import { COSTS, NODES, PRIORITIES, PRIORITY_SETTINGS } from './data.js';

const byShort = Object.fromEntries(NODES.map(node => [node.short, node]));
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
  const patch = priorityPatch(mode);
  return NODES.filter(node => (patch === 'taotie' || node.short !== 'Taotie') && (patch !== 'hecate' || node.short !== 'Lotus'));
}

export function taotieCatchUp(levels, mode, order = PRIORITIES[mode]) {
  if (priorityPatch(mode) !== 'taotie') return null;
  let target = 0;
  for (const step of order) {
    if (step.skill === 'Taotie') target = Math.max(target, step.level);
    else if ((levels[step.skill] || 0) < step.level) break;
  }
  const current = levels.Taotie || 0;
  return target > current ? { target, cost: rangeCost('Taotie', current, target) } : null;
}

export function rangeCost(skill, from, to) {
  const node = byShort[skill];
  if (!node) return null;
  const result = { erda: 0, frags: 0 };
  for (let level = from + 1; level <= to; level++) {
    const cost = COSTS[node.type]?.[level - 1];
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
    const initial = node.short === 'Apotheosis' ? 1 : 0;
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

// Completed checkpoints do not interrupt a run of remaining upgrades. Keep
// them as separate rows for the optional full view, and retain source indices.
export function displayPriorityRows(levels, mode, order = PRIORITIES[mode], unlocked = {}) {
  const rows = priorityRows(levels, mode, order, unlocked);
  const display = [];
  let lastUnmet = null;
  for (const row of rows) {
    if (row.done) {
      display.push({ ...row, endIndex: row.index });
      continue;
    }
    if (lastUnmet?.skill === row.skill) {
      lastUnmet.level = row.level;
      lastUnmet.endIndex = row.index;
      lastUnmet.cost = row.cost.rng ? lastUnmet.cost : rangeCost(row.skill, levels[row.skill] || 0, row.level);
    } else {
      lastUnmet = { ...row, endIndex: row.index,
        cost: row.cost.rng ? row.cost : rangeCost(row.skill, levels[row.skill] || 0, row.level) };
      display.push(lastUnmet);
    }
  }
  return display;
}

// Only report complete Scouter transitions. A partially levelled checkpoint
// has no observed FD value for its remaining levels.
export function sourceStepGains(order, row, currentLevel) {
  let from = currentLevel;
  const gains = [];
  for (const step of order.slice(row.index - 1, row.endIndex)) {
    if (step.skill !== row.skill || step.level <= currentLevel) continue;
    if (step.fdFrom === from && Number.isFinite(step.fdGain)) gains.push(step);
    from = step.level;
  }
  return gains;
}
