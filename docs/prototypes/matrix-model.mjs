// Prototype only. No class names, progress or release-status list in geometry.
export const quadrants = {
  Skill: { key: 'skill', prefix: 'skillCore', points: [[164,152],[108,152],[136,104],[80,104],[108,56],[52,56]] },
  Mastery: { key: 'mastery', prefix: 'masteryCore', points: [[276,152],[304,104],[360,104],[388,56]] },
  Enhancement: { key: 'enhancement', prefix: 'reinCore', points: [[164,264],[136,312],[80,312],[52,360]] },
  Common: { key: 'common', prefix: 'generalCore', points: [[276,264],[304,312],[360,312],[388,360]] }
};
export function matrixLocations(skills, availableCoreIds) {
  const slots = Object.entries(quadrants).flatMap(([category,q]) => q.points.map(([x,y],i) => ({id:`${q.key}_${i+1}`,category,ordinal:i+1,x,y,skill:null,available:false})));
  const byId = new Map(slots.map(s=>[s.id,s]));
  for (const skill of skills) {
    const match=/^(skillCore|masteryCore|reinCore|generalCore)([1-9]\d*)$/.exec(skill.coreId);
    // HEXA Stats have no agreed position, so are reported separately.
    if (!match) { if(/^hexastat[123]$/i.test(skill.coreId))continue; throw new Error(`Unknown core: ${skill.coreId}`); }
    const q=quadrants[skill.category];
    if (!q || q.prefix!==match[1])throw new Error(`Category/order mismatch: ${skill.coreId}`);
    const slot=byId.get(`${q.key}_${Number(match[2])}`);
    if (!slot)throw new Error(`No agreed position: ${skill.coreId}`);
    if (slot.skill)throw new Error(`Duplicate Matrix position: ${skill.coreId}`);
    slot.skill=skill;slot.available=availableCoreIds.has(skill.coreId);
  }
  return slots;
}
