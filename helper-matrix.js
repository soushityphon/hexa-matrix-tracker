// Shared geometry. No class names, progress or separate release-status list.
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

const categories={'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'};
export function catalogueLocations(nodes, availableSkills) {
  return matrixLocations(nodes.map(node=>({...node,coreId:node.sourceKey,category:categories[node.group]})),
    new Set(nodes.filter(node=>node.isJanus || availableSkills.has(node.short)).map(node=>node.sourceKey)));
}

export function renderMatrixLocation(container, slots, target) {
  const document=container.ownerDocument,ns='http://www.w3.org/2000/svg';
  const element=(tag,attrs)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
  const hex=(x,y,r)=>Array.from({length:6},(_,i)=>{const angle=(i*60-90)*Math.PI/180;return `${x+Math.cos(angle)*r},${y+Math.sin(angle)*r}`;}).join(' ');
  const svg=element('svg',{viewBox:'12 16 416 384',role:'img','aria-label':target ? `HEXA Matrix location for ${target.name || target.short}` : 'HEXA Matrix locations',focusable:'false'});
  for(const slot of slots) {
    const selected=slot.available && slot.skill?.short===target?.short;
    const group=element('g',{'data-location':slot.id,'data-available':slot.available,'data-target':selected,class:selected?'matrix-target':slot.available?'matrix-other':'matrix-locked'});
    group.append(element('polygon',{points:hex(slot.x,slot.y,32),class:'matrix-'+quadrants[slot.category].key}));
    if(slot.available) {
      const image=element('image',{x:slot.x-16,y:slot.y-16,width:32,height:32,href:slot.skill.icon || ''});
      image.addEventListener('error',()=>{image.remove();});group.append(image);
    }else {
      group.append(element('rect',{x:slot.x-7,y:slot.y-2,width:14,height:13,rx:2,class:'matrix-lock'}),element('path',{d:`M${slot.x-5} ${slot.y-2}v-5a5 5 0 0 1 10 0v5`,class:'matrix-lock-loop'}));
    }
    const title=element('title',{});title.textContent=slot.available?(slot.skill.name || slot.skill.short):'Unavailable';group.append(title);svg.append(group);
  }
  svg.append(element('polygon',{points:hex(220,208,24),class:'matrix-centre'}));
  container.replaceChildren(svg);
}
