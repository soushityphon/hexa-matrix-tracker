import { COSTS, NODES, PRIORITIES } from './data.js';

const byShort = Object.fromEntries(NODES.map(node => [node.short, node]));
export function activeNodes(mode) {
  return NODES.filter(node => mode.startsWith('taotie_') || node.short !== 'Taotie');
}

export function taotieCatchUp(levels, mode) {
  if (!mode.startsWith('taotie_')) return null;
  let target = 0;
  for (const step of PRIORITIES[mode]) {
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

export function matrixTotals(levels, mode) {
  const spent = { erda: 0, frags: 0 };
  const remaining = { erda: 0, frags: 0 };
  const total = { erda: 0, frags: 0 };
  for (const node of activeNodes(mode)) {
    const current = levels[node.short] || 0;
    for (const [target, cost] of [
      [spent, rangeCost(node.short, 0, current)],
      [remaining, rangeCost(node.short, current, 30)],
      [total, rangeCost(node.short, 0, 30)]
    ]) {
      target.erda += cost.erda;
      target.frags += cost.frags;
    }
  }
  return { spent, remaining, total, percent: total.frags ? spent.frags / total.frags * 100 : 0 };
}

export function nextCheckpoint(levels, mode) {
  const steps = PRIORITIES[mode];
  const index = steps.findIndex(step => (levels[step.skill] || 0) < step.level);
  return { steps, index: index < 0 ? steps.length : index, next: index < 0 ? null : steps[index] };
}
