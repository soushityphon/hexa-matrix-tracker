// Stable class/core identities are independent of editable display names.
export const renSkillKey=coreId=>'ren_'+coreId;
export const renStatKey=coreId=>['HEXA Stat I','HEXA Stat II','HEXA Stat III'][Number(/^hexaStat([123])$/i.exec(coreId)?.[1])-1];
export const sourceGroup=category=>({Skill:'Skill Nodes',Mastery:'Mastery Nodes',Enhancement:'Enhancement Nodes',Common:'Common Nodes'})[category];
export function renNode(source) {
  if(!/^(?:skillCore|masteryCore|reinCore|generalCore)[1-9]\d*$/.test(source?.coreId))return null;
  return {short:renSkillKey(source.coreId),id:'ren-'+source.coreId,coreId:source.coreId,group:sourceGroup(source.category),type:({Skill:'Skill',Mastery:'Mastery',Enhancement:'V',Common:'Common'})[source.category],initialLevel:source.costs?.freeBaseLevel ?? source.freeBaseLevel};
}
export function renDraftFromCapture(candidate,catalogue) {
  if(candidate?.job!=='렌'||candidate.issues?.length||catalogue?.job!=='렌')throw new Error('Validated Ren capture required');
  const sourceSkills=catalogue.skills.map(source=>({coreId:source.coreId,sourceName:source.sourceName,icon:catalogue.sourceIconOverrides?.[source.coreId] || source.icon,category:source.category,freeBaseLevel:source.costs.freeBaseLevel}));
  const capturedCosts=Object.fromEntries(catalogue.skills.map(source=>[renSkillKey(source.coreId),{freeBaseLevel:source.costs.freeBaseLevel,levels:source.costs.levels.map(({erda,frags})=>({erda,frags}))}]));
  const statIcons={};
  const steps=candidate.steps.map(step=>{
    const stat=renStatKey(step.coreId);
    if(stat){statIcons[stat]=step.icon;return {skill:stat,level:20};}
    const fdGain=step.fd?.checkpointGainPercent;
    return {skill:renSkillKey(step.coreId),level:step.level,sourceCost:{from:step.from,...step.sourceMaterials},...(Number.isFinite(fdGain)&&fdGain>=0?{fdFrom:step.from,fdGain}: {})};
  });
  return {job:'렌',sourceMode:`ren_${candidate.selection.region.toLowerCase()}_${candidate.selection.world.toLowerCase()}`,sourceSkills,capturedCosts,
    costProvenance:{capturedAt:catalogue.provenance.costs.capturedAt,resources:Object.values(catalogue.provenance)},
    source:`Maple Scouter ${candidate.selection.region}, captured ${candidate.provenance?.response?.capturedAt || new Date().toISOString()}`,
    captureProvenance:candidate.provenance || {},requestContext:candidate.requestContext || {},
    steps,statIcons,statObservations:candidate.steps.filter(step=>renStatKey(step.coreId)).map(step=>({skill:renStatKey(step.coreId),sourceMaterials:structuredClone(step.sourceMaterials),fd:structuredClone(step.fd),materialBasis:'RNG estimate'})),names:{},shortNames:{},tags:{},skillCategories:{},newNodes:[]};
}
export function renCatalogueFromDrafts(drafts,review) {
  const rows=new Map((review?.rows || []).map(row=>[row.coreId,row]));
  const nodes=new Map(),stats=new Map();
  for(const draft of Object.values(drafts))if(draft.job==='렌') {
    for(const source of draft.sourceSkills) {
      const node=renNode(source),row=rows.get(source.coreId),cost=draft.capturedCosts[node.short];
      nodes.set(node.short,{...node,name:row?.name || source.sourceName,shortName:row?.shortName || source.sourceName,icon:source.icon,tag:row?.tag || '',group:sourceGroup(row?.category || source.category),costs:cost.levels,initialLevel:cost.freeBaseLevel});
    }
    for(const [short,icon] of Object.entries(draft.statIcons)) {
      const n=['HEXA Stat I','HEXA Stat II','HEXA Stat III'].indexOf(short)+1,row=rows.get('hexastat'+n);
      stats.set(short,{short,name:row?.name || short,shortName:row?.shortName || short,icon,tag:row?.tag || ''});
    }
  }
  return {nodes:[...nodes.values()],stats:[...stats.values()],pending:0};
}
