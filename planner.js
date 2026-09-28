import { COSTS, NODES, PRIORITIES, PRIORITY_SETTINGS } from './data.js';

const byShort = Object.fromEntries(NODES.map(node => [node.short, node]));
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

export function matrixTotals(levels, mode, includeJanus = false) {
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
  return { spent, remaining, total, percent: total.frags ? spent.frags / total.frags * 100 : 0 };
}

export function nextCheckpoint(levels, mode, steps = PRIORITIES[mode]) {
  const index = steps.findIndex(step => (levels[step.skill] || 0) < step.level);
  const completed = steps.filter(step => (levels[step.skill] || 0) >= step.level).length;
  return { steps, index: index < 0 ? steps.length : index, completed, next: index < 0 ? null : steps[index] };
}

export function priorityRows(levels, mode, order = PRIORITIES[mode]) {
  const previous = { ...levels };
  return order.map((step, index) => {
    const from = previous[step.skill] || 0;
    const done = (levels[step.skill] || 0) >= step.level;
    const cost = step.skill.startsWith('HEXA Stat') ? null : rangeCost(step.skill, Math.min(from, step.level), step.level);
    previous[step.skill] = Math.max(from, step.level);
    return { ...step, index: index + 1, from, done, cost };
  });
}
