import { NODES } from './data.js';

const knownIcons = new Map(NODES.map(node => [new URL(node.icon).pathname, node.short]));
const statNames = ['HEXA Stat I', 'HEXA Stat II', 'HEXA Stat III'];
const statIconPattern = /^https:\/\/open\.api\.nexon\.com\/static\/maplestory\/skill\/icon\/[A-Za-z0-9_-]+$/;

export function inspectScouterResponse(response) {
  if (!response || !Array.isArray(response.class_hexa) || !response.class_hexa.length) {
    throw new Error('Paste a Maple Scouter HEXA order response with class_hexa steps');
  }
  const unknown = new Map();
  const statIcons = {};
  const steps = response.class_hexa.map((row, index) => {
    const [sourceName, level, icon, erda, fragments, , , efficiency, , coreId] = row;
    if (typeof sourceName !== 'string' || typeof icon !== 'string' || typeof coreId !== 'string' || !Number.isInteger(level) || level < 1 || level > 30) {
      throw new Error(`Invalid Maple Scouter step ${index + 1}`);
    }
    const statNumber = /^hexastat([123])$/i.exec(coreId)?.[1];
    if (statNumber) {
      if (!statIconPattern.test(icon)) throw new Error(`Invalid HEXA Stat icon at step ${index + 1}`);
      const skill = statNames[Number(statNumber) - 1];
      statIcons[skill] = icon;
      return { skill, level: 20, sourceName, coreId, icon };
    }
    const skill = knownIcons.get(icon);
    if (!skill) {
      const key = `${coreId}|${icon}`;
      unknown.set(key, { key, sourceName, coreId, icon });
    }
    // Scouter field 7 is FD efficiency per 30 Fragments. Preserve the
    // whole checkpoint gain, including multi-level transitions.
    const fdGain = Number.isFinite(efficiency) && efficiency >= 0 && Number.isInteger(fragments) && fragments > 0
      ? Math.round(efficiency * fragments / 30 * 1e6) / 1e6 : null;
    return { skill: skill || null, level, sourceName, coreId, icon, fdGain, sourceMaterials: { erda, frags: fragments } };
  });
  return { steps, unknown: [...unknown.values()], statIcons };
}

export function resolveScouterResponse(inspected, mappings = {}) {
  const newNodes = inspected.unknown.map(item => {
    const mapping = mappings[item.key];
    if (!mapping?.short?.trim() || !mapping?.name?.trim() || !mapping?.type) {
      throw new Error(`Name and classify ${item.sourceName} (${item.coreId}) before downloading`);
    }
    return { short: mapping.short.trim(), name: mapping.name.trim(), type: mapping.type, icon: `https://maplescouter.com${item.icon}`, sourceName: item.sourceName, coreId: item.coreId };
  });
  const byKey = new Map(inspected.unknown.map((item, index) => [item.key, newNodes[index].short]));
  const previous = new Map();
  const steps = inspected.steps.map(row => {
    const skill = row.skill || byKey.get(`${row.coreId}|${row.icon}`);
    const from = previous.get(skill) || 0;
    previous.set(skill, row.level);
    return { skill, level: row.level,
      ...(!/^HEXA Stat /.test(skill) && Number.isInteger(row.sourceMaterials?.erda) && Number.isInteger(row.sourceMaterials?.frags)
        ? { sourceCost: { from, erda: row.sourceMaterials.erda, frags: row.sourceMaterials.frags } } : {}),
      ...(row.fdGain === null || row.fdGain === undefined ? {} : { fdFrom: from, fdGain: row.fdGain }) };
  });
  return { steps, newNodes, statIcons: inspected.statIcons || {} };
}
