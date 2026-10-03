import {discoverySelection} from './scouter-discovery.js';

// Compare source candidates without importing reviewed aliases or tracker data.
// Missing provenance is unknown, even when both inputs lack the same field.
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const present = value => value !== undefined && value !== null && value !== '';
function context(candidate) {
  if (typeof candidate?.job !== 'string' || !candidate.job) throw new Error('Comparison requires source job identity');
  const selection=discoverySelection(candidate.selection?.region,candidate.selection?.world);
  const source=candidate.source || {};
  const request=candidate.requestContext || {};
  for (const value of [source.standard,source.patch,request.patchVersion,request.benchmarkFingerprint,request.resetFingerprint,candidate.provenance?.response?.capturedAt]) {
    if (present(value) && typeof value !== 'string') throw new Error('Invalid comparison context');
  }
  const capturedAt=candidate.provenance?.response?.capturedAt;
  if (present(capturedAt) && !Number.isFinite(Date.parse(capturedAt))) throw new Error('Invalid response capture date');
  for(const fingerprint of [request.benchmarkFingerprint,request.resetFingerprint]) if (present(fingerprint) && !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Comparison fingerprints must be SHA-256 hashes, not private request values');
  return {job:candidate.job,region:selection.region,world:selection.world,
    standard:source.standard,sourcePatch:source.patch,patchVersion:request.patchVersion,
    benchmarkFingerprint:request.benchmarkFingerprint,resetFingerprint:request.resetFingerprint,
    capturedAt};
}
function checkpoints(candidate) {
  if (!Array.isArray(candidate.steps) || !candidate.steps.length) throw new Error('Comparison requires source checkpoints');
  return candidate.steps.map(step=>{
    if (typeof step.coreId !== 'string' || !/^(?:(?:skillCore|masteryCore|reinCore|generalCore)[1-9]\d*|hexaStat[1-6])$/.test(step.coreId) ||
        !Number.isInteger(step.level) || step.level<1 || step.level>(/^hexaStat/.test(step.coreId)?20:30)) throw new Error('Invalid source checkpoint identity');
    const materials=step.sourceMaterials;
    if (step.from!=null && (!Number.isInteger(step.from)||step.from<0||step.from>=step.level)) throw new Error('Invalid comparison baseline');
    if (materials && ![materials.erda,materials.frags].every(v=>Number.isSafeInteger(v)&&v>=0)) throw new Error('Invalid comparison materials');
    const gain=step.fd?.checkpointGainPercent;
    if (gain!=null && (!Number.isFinite(gain)||gain<0)) throw new Error('Invalid comparison FD');
    return {coreId:step.coreId,level:step.level,from:step.from??null,
      materials:materials?{erda:materials.erda,frags:materials.frags}:null,fd:gain??null};
  });
}
export function compareScouterCandidates(before,after) {
  const left=context(before),right=context(after);
  const contexts=Object.keys(left).map(field=>({field,before:left[field]??null,after:right[field]??null,
    status:!present(left[field])||!present(right[field])?'unknown':same(left[field],right[field])?'same':'different'}));
  const a=checkpoints(before),b=checkpoints(after),differences=[];
  for(let i=0;i<Math.max(a.length,b.length);i++) {
    const x=a[i],y=b[i];
    if (!x || !y || x.coreId!==y.coreId || x.level!==y.level) {
      differences.push({position:i+1,kind:'order',before:x?{coreId:x.coreId,level:x.level}:null,after:y?{coreId:y.coreId,level:y.level}:null});
    }
  }
  const exactOrder=differences.length===0;
  // Checkpoint FD depends on preceding simulated state. Compare it only after
  // an exact full-order match, never by a convenient skill/target match.
  const values=[];
  if (exactOrder) for(let i=0;i<a.length;i++) {
    for(const field of ['from','materials','fd']) {
      if (field==='fd' && /^hexaStat/.test(a[i].coreId)) continue;
      const x=a[i][field],y=b[i][field];
      values.push({position:i+1,field,status:x===null||y===null?'unknown':same(x,y)?'same':'different'});
    }
  }
  const comparable=contexts.filter(c=>c.field!=='capturedAt').every(c=>c.status==='same');
  const validation={before:Array.isArray(before.issues)?before.issues.length?'failed':'passed':'unknown',after:Array.isArray(after.issues)?after.issues.length?'failed':'passed':'unknown'};
  const validated=Object.values(validation).every(v=>v==='passed');
  return {schema:1,namespace:'isolated-scouter-comparison',counts:{before:a.length,after:b.length},
    exactOrder,contexts,differences,checkpointValues:values,validation,
    contextComparable:comparable,fdComparable:validated&&comparable&&exactOrder&&values.filter(v=>v.field==='from'||v.field==='fd').every(v=>v.status!=='unknown')&&values.filter(v=>v.field==='from').every(v=>v.status==='same'),
    requiresReview:!validated||!comparable||!exactOrder||values.some(v=>v.status!=='same'),
    publishable:false,limitations:['Matching benchmark labels do not prove matching character calculations','Missing request provenance remains unknown','This report never changes display names, visibility, saved orders or player progress']};
}
