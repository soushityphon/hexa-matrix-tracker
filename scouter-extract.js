import { PRIORITIES } from './data.js';
import { rangeCost } from './planner.js';
import { inspectScouterResponse, resolveScouterResponse } from './scouter-import.js';

const integer = value => Number.isInteger(value) && value >= 0;
const same = (a, b) => !!a && !!b && a.skill === b.skill && a.level === b.level;

/** Extract only order data from a Scouter response. The player's profile is never copied. */
export function extractScouterOrder(response, mode, mappings = {}) {
  if (!Object.hasOwn(PRIORITIES, mode)) throw new Error(`Unknown priority mode: ${mode}`);
  const inspected = inspectScouterResponse(response);
  const unresolved = inspected.unknown.filter(item => !mappings[item.key]);
  const resolved = unresolved.length ? null : resolveScouterResponse(inspected, mappings);
  const previous = { Apotheosis: 1 }; // Origin is opened at level 1 for this fixed profile.
  const issues = [];
  let running = { erda: 0, frags: 0 };
  const rows = inspected.steps.map((step, index) => {
    const raw = response.class_hexa[index];
    const [erda, frags, cumulativeErda, cumulativeFrags] = raw.slice(3, 7);
    if (![erda, frags, cumulativeErda, cumulativeFrags].every(integer)) {
      issues.push({ row: index + 1, kind: 'invalid-materials' });
    }
    if (integer(erda) && integer(frags)) {
      running = { erda: running.erda + erda, frags: running.frags + frags };
      if (running.erda !== cumulativeErda || running.frags !== cumulativeFrags) {
        issues.push({ row: index + 1, kind: 'cumulative-materials', expected: running, actual: { erda: cumulativeErda, frags: cumulativeFrags } });
      }
    }
    const skill = resolved?.steps[index].skill || step.skill;
    const level = step.level;
    const isStat = /^HEXA Stat /.test(skill || '');
    const from = skill ? (previous[skill] || 0) : null;
    if (skill && !isStat) {
      if (level <= from) issues.push({ row: index + 1, kind: 'non-increasing-level', skill, from, level });
      else {
        const expected = rangeCost(skill, from, level);
        if (expected && (expected.erda !== erda || expected.frags !== frags)) {
          issues.push({ row: index + 1, kind: 'material-cost', skill, from, level, expected, actual: { erda, frags } });
        }
        previous[skill] = level;
      }
    }
    return { position: index + 1, skill, level, sourceName: step.sourceName, coreId: step.coreId,
      icon: step.icon, transition: raw[10], materials: { erda, frags }, cumulative: { erda: cumulativeErda, frags: cumulativeFrags },
      materialBasis: isStat ? 'Scouter estimate; HEXA Stat leveling is random' : 'checkpoint' };
  });
  const saved = PRIORITIES[mode];
  const steps = resolved?.steps || null;
  const firstDifference = steps ? steps.findIndex((step, index) => !same(step, saved[index])) : -1;
  return {
    schema: 1, mode, source: { standard: response.standard ?? null, patch: response.patch ?? null, hexaUpdated: response.hexa_updated ?? null },
    count: rows.length, rows, steps, unknown: inspected.unknown, statIcons: inspected.statIcons,
    validation: { issues, finalCumulative: rows.at(-1)?.cumulative || null },
    comparison: steps ? { savedCount: saved.length, exact: steps.length === saved.length && firstDifference === -1,
      firstDifference: firstDifference < 0 && steps.length !== saved.length ? Math.min(steps.length, saved.length) + 1 : firstDifference + 1,
      incomingAtDifference: steps[firstDifference] || steps[saved.length] || null,
      savedAtDifference: saved[firstDifference] || saved[steps.length] || null } : null
  };
}
