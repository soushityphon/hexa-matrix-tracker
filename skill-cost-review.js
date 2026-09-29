import { COSTS } from './data.js';
import { STAT_UNLOCK_COSTS } from './planner.js';

const categories = { Skill: 'Skill', 'Skill II': 'Skill', Mastery: 'Mastery', V: 'Enhancement', Common: 'Common', 'Common II': 'Common' };

export function skillCostReview(nodes, steps) {
  return nodes.map(node => {
    const isStat = node.type === 'HEXA Stat';
    const schedule = isStat || node.unreviewed ? null : COSTS[node.type] || null;
    const observations = steps.filter(step => step.skill === node.short && step.sourceCost).map(step => {
      const { from, erda, frags } = step.sourceCost;
      const expected = schedule && Number.isInteger(from) && from >= 0 && step.level <= schedule.length
        ? schedule.slice(from, step.level).reduce((total, cost) => ({ erda: total.erda + cost.erda, frags: total.frags + cost.frags }), { erda: 0, frags: 0 }) : null;
      return { from, to: step.level, erda, frags, expected,
        matches: !!expected && expected.erda === erda && expected.frags === frags,
        oneLevel: step.level === from + 1 };
    });
    return { ...node, category: isStat ? 'HEXA Stat' : categories[node.type] || 'Needs classification', schedule,
      unlock: isStat ? STAT_UNLOCK_COSTS[node.short] : null,
      observations, oneLevelCount: observations.filter(row => row.oneLevel).length,
      aggregateCount: observations.filter(row => !row.oneLevel).length,
      state: isStat ? 'rng' : node.unreviewed ? 'pending' : !schedule ? 'missing' : observations.some(row => !row.matches) ? 'mismatch'
        : observations.length ? 'matches' : 'unobserved' };
  });
}
