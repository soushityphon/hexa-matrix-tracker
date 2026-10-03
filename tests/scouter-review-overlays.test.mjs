import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverySelection,reconstructScouterOrder} from '../scouter-discovery.js';
import {compareScouterCandidates} from '../scouter-comparison.js';
import {createScouterNameOverlay,createScouterOrderOverlay,reviewScouterOverlays,scouterReviewFingerprint} from '../scouter-review-overlays.js';

// Synthetic source data exercises the reusable contract, not a supported job.
const selection = discoverySelection('KMS','Heroic');
const costs = {freeBaseLevel:1,levels:Array.from({length:30},(_,i) => ({level:i+1,erda:i+1,frags:(i+1)*3}))};
const catalogue = {job:'테스트',selection,skills:[
  {coreId:'skillCore1',sourceName:'원점',icon:'https://maplescouter.com/hexaskill/Test_1.png',category:'Skill',costs},
  {coreId:'generalCore2',sourceName:'공용',icon:'https://maplescouter.com/hexaskill/General/General_2_0.png',category:'Common',costs:{...costs,freeBaseLevel:0}}
],placeholders:[{coreId:'skillCore4',sourceName:'빈 슬롯'}],
sourceIconOverrides:{generalCore2:'https://maplescouter.com/hexaskill/General/General_2.png'},
provenance:{metadata:{sha256:'a'.repeat(64),capturedAt:'2026-09-30T03:00:00Z'}}};
const response = {standard:'dummy',class_hexa:[
  ['원점',3,'/hexaskill/Test_1.png',5,15,5,15,1.5,1.012,'skillCore1','원점 1→3'],
  ['공용',1,'/hexaskill/General/General_2.png',1,3,6,18,0.5,1.013,'generalCore2','공용 0→1'],
  ['헥사스탯1',1,'https://open.api.nexon.com/static/maplestory/skill/icon/EXAMPLE',5,100,11,118,0.5,1.013,'hexaStat1','헥사스탯1 0→20']
]};
const candidate = reconstructScouterOrder(response,catalogue,selection,catalogue.sourceIconOverrides);
assert.deepEqual(candidate.issues,[]);
const choices = [
  {coreId:'skillCore1',longName:'Long Origin',shortName:'Origin'},
  {coreId:'generalCore2',longName:'Long Common',shortName:'Common'},
  {coreId:'hexaStat1',longName:'HEXA Stat I',shortName:'Stat I'}
];
const before = structuredClone({catalogue,candidate});
const nameOverlay = createScouterNameOverlay(catalogue,choices,candidate);
assert.equal(nameOverlay.names[1].icon,catalogue.sourceIconOverrides.generalCore2);
const orderOverlay = await createScouterOrderOverlay(catalogue,candidate,{name:'Review version',visible:true});
const review = await reviewScouterOverlays(catalogue,candidate,{nameOverlay,orderOverlay});
assert.equal(review.overlayReviewComplete,true);
assert.equal(review.publishable,false);
assert.equal(review.order.requestedVisible,true);
assert.deepEqual(review.skills.map(s=>s.shortName),['Origin','Common','Stat I']);
assert.deepEqual({catalogue,candidate},before);
assert.deepEqual(candidate.reviewedOverrides,{});

// Exact source checkpoints, costs, RNG and FD stay independent of labels.
const renamed = createScouterNameOverlay(catalogue,choices.map(c=>({...c,longName:'Renamed '+c.longName,shortName:'Same label'})),candidate);
const hidden = await createScouterOrderOverlay(catalogue,candidate,{name:'Hidden version',visible:false});
assert.equal(hidden.sourceFingerprint,orderOverlay.sourceFingerprint);
assert.equal((await reviewScouterOverlays(catalogue,candidate,{nameOverlay:renamed,orderOverlay:hidden})).order.requestedVisible,false);
assert.equal(compareScouterCandidates(before.candidate,candidate).exactOrder,true);
assert.deepEqual(candidate.steps,before.candidate.steps);
assert.equal(candidate.steps[2].materialBasis,'RNG estimate');
assert.equal(candidate.steps[2].fd.checkpointGainPercent,undefined);
assert.equal(candidate.steps[0].fd.checkpointGainPercent,0.75);

const empty = await reviewScouterOverlays(catalogue,candidate);
assert.equal(empty.order.requestedVisible,false);
assert.equal(empty.overlayReviewComplete,false);
assert.equal(empty.blockers.filter(b=>b.kind==='display-name').length,3);
assert.throws(()=>createScouterNameOverlay(catalogue,[{...choices[0],shortName:' '}],candidate));
assert.throws(()=>createScouterNameOverlay(catalogue,[{...choices[0],longName:123}],candidate));
assert.throws(()=>createScouterNameOverlay(catalogue,[{...choices[0],coreId:'skillCore4'}],candidate));
assert.throws(()=>createScouterNameOverlay(catalogue,[choices[0],choices[0]],candidate));
await assert.rejects(createScouterOrderOverlay(catalogue,candidate,{name:'No choice'}),/explicitly/);
await assert.rejects(createScouterOrderOverlay(catalogue,candidate,{name:'',visible:false}));
await assert.rejects(reviewScouterOverlays(catalogue,candidate,{nameOverlay:{...nameOverlay,job:'Other'}}),/scope/);
await assert.rejects(reviewScouterOverlays(catalogue,candidate,{orderOverlay:{...orderOverlay,visible:'true'}}),/scope/);

// A changed source identity in a reused core never inherits reviewed labels.
const changedCatalogue = structuredClone(catalogue), changedCandidate = structuredClone(candidate);
changedCatalogue.skills[0].sourceName='New source name';changedCandidate.steps[0].sourceName='New source name';
const changed = await reviewScouterOverlays(changedCatalogue,changedCandidate,{nameOverlay,orderOverlay});
assert.equal(changed.skills[0].state,'source-changed');assert.equal(changed.skills[0].longName,null);
assert.equal(changed.skills[1].state,'reviewed');assert.equal(changed.order.requestedVisible,false);
const changedIconCatalogue = structuredClone(catalogue), changedIconCandidate = structuredClone(candidate);
changedIconCatalogue.skills[0].icon='https://maplescouter.com/hexaskill/New_1.png';changedIconCandidate.steps[0].icon=changedIconCatalogue.skills[0].icon;
assert.equal((await reviewScouterOverlays(changedIconCatalogue,changedIconCandidate,{nameOverlay})).skills[0].state,'source-changed');

// A new skill stays unnamed; inactive names survive in the untouched overlay.
const expanded = structuredClone(catalogue);
expanded.skills.push({coreId:'masteryCore1',sourceName:'New mastery',icon:'https://maplescouter.com/hexaskill/Test_2.png'});
const expandedReview = await reviewScouterOverlays(expanded,candidate,{nameOverlay,orderOverlay});
assert.equal(expandedReview.skills.find(s=>s.coreId==='masteryCore1').state,'missing');
const reduced = structuredClone(catalogue);reduced.skills= reduced.skills.slice(0,1);
const reducedCandidate = structuredClone(candidate);reducedCandidate.steps=reducedCandidate.steps.filter(s=>s.coreId!=='generalCore2');
assert.deepEqual((await reviewScouterOverlays(reduced,reducedCandidate,{nameOverlay})).inactiveNames,['generalCore2']);
assert.equal(nameOverlay.names.length,3);

// Explicit visibility binds context, order, costs, FD and source provenance.
for (const change of [
  c=>c.steps.reverse(), c=>c.steps[0].fd.checkpointGainPercent=0.8,
  c=>c.source.patch='another', c=>c.requestContext={benchmarkFingerprint:'b'.repeat(64)},
  c=>c.provenance={response:{sha256:'c'.repeat(64),capturedAt:'2026-09-30T04:00:00Z'}},
  c=>c.steps[0].sourceMaterials.frags++, c=>c.issues.push({kind:'checkpoint-cost'})
]) {
  const different = structuredClone(candidate);change(different);
  const r=await reviewScouterOverlays(catalogue,different,{nameOverlay,orderOverlay});
  assert.equal(r.order.state,'source-changed');assert.equal(r.order.requestedVisible,false);
  assert.equal(r.overlayReviewComplete,false);assert.equal(r.publishable,false);
}
const bad = structuredClone(candidate);bad.issues.push({kind:'checkpoint-cost'});
const badChoice = await createScouterOrderOverlay(catalogue,bad,{name:'Pending',visible:true});
assert((await reviewScouterOverlays(catalogue,bad,{nameOverlay,orderOverlay:badChoice})).blockers.some(b=>b.kind==='source-validation'));
const missingIssues = structuredClone(candidate);delete missingIssues.issues;
assert((await reviewScouterOverlays(catalogue,missingIssues,{nameOverlay})).blockers.some(b=>b.kind==='source-validation'));

// Names carry across regions/worlds, but order choices never cross that scope.
for (const region of ['GMS','KMS']) for (const world of ['Heroic','Interactive']) {
  const cat=structuredClone(catalogue),order=structuredClone(candidate);
  cat.selection=discoverySelection(region,world);order.selection=cat.selection;
  const r=await reviewScouterOverlays(cat,order,{nameOverlay,orderOverlay});
  assert(r.skills.every(s=>s.state==='reviewed'));
  assert.equal(r.order.state,region==='KMS'&&world==='Heroic'?'reviewed':'source-changed');
  assert.equal(r.publishable,false);
}
await assert.rejects(reviewScouterOverlays(catalogue,{...candidate,job:'Other'}),/scope/);
const mismatch=structuredClone(candidate);mismatch.steps[0].sourceName='Wrong';
await assert.rejects(reviewScouterOverlays(catalogue,mismatch),/identity/);

// Cost/provenance updates keep names, and require a new order choice.
const changedCosts=structuredClone(catalogue);changedCosts.skills[0].costs.levels[0].frags++;
const costsReview=await reviewScouterOverlays(changedCosts,candidate,{nameOverlay,orderOverlay});
assert(costsReview.skills.every(s=>s.state==='reviewed'));assert.equal(costsReview.order.state,'source-changed');
const ignored=structuredClone(candidate);ignored.reviewedOverrides={privateLabel:'ignored'};
assert.equal(await scouterReviewFingerprint(catalogue,ignored),orderOverlay.sourceFingerprint);
const reordered={...catalogue,selection:{...catalogue.selection}};
reordered.selection=Object.fromEntries(Object.entries(reordered.selection).reverse());
assert.equal(await scouterReviewFingerprint(reordered,candidate),orderOverlay.sourceFingerprint);
const mutableCat=structuredClone(catalogue),mutableCandidate=structuredClone(candidate),mutableNames=structuredClone(nameOverlay),mutableVisibility=structuredClone(orderOverlay);
const pending=reviewScouterOverlays(mutableCat,mutableCandidate,{nameOverlay:mutableNames,orderOverlay:mutableVisibility});
mutableCandidate.steps[0].level=30;mutableNames.names[0].longName='Mutated';mutableVisibility.visible=false;
assert.equal((await pending).order.requestedVisible,true);
assert.equal((await pending).skills[0].longName,'Long Origin');
const encoded=JSON.stringify(review);
assert(!encoded.includes('privateLabel'));assert(!encoded.includes('checkpointGainPercent'));

// The retained 206-row capture is dated regression evidence, not a complete
// catalogue or proof of current requests. No missing FD/provenance is backfilled.
const capture=JSON.parse(readFileSync(new URL('../data/scouter-kms-taotie-fragment-extracted-2026-09-28.json',import.meta.url),'utf8'));
const evidenceSteps=capture.rows.map(row=>({...row,icon:new URL(row.icon,'https://maplescouter.com').href}));
const evidenceSkills=[...new Map(evidenceSteps.filter(s=>!s.coreId.startsWith('hexaStat')).map(s=>[s.coreId,{coreId:s.coreId,sourceName:s.sourceName,icon:s.icon}])).values()];
const evidenceCatalogue={job:'호영',selection,skills:evidenceSkills};
const evidenceCandidate={job:'호영',selection,source:capture.source,steps:evidenceSteps,issues:capture.validation.issues};
const evidenceBefore=structuredClone({evidenceCatalogue,evidenceCandidate});
const evidenceNames=[...new Map(evidenceSteps.map(s=>[s.coreId,{coreId:s.coreId,longName:s.skill,shortName:s.skill}])).values()];
const evidenceOverlay=createScouterNameOverlay(evidenceCatalogue,evidenceNames,evidenceCandidate);
const evidenceChoice=await createScouterOrderOverlay(evidenceCatalogue,evidenceCandidate,{name:'Dated regression only',visible:false});
const evidenceReview=await reviewScouterOverlays(evidenceCatalogue,evidenceCandidate,{nameOverlay:evidenceOverlay,orderOverlay:evidenceChoice});
assert.equal(evidenceReview.overlayReviewComplete,true);assert.equal(evidenceReview.publishable,false);
assert.equal(evidenceReview.skills.filter(s=>s.coreId.startsWith('hexaStat')).length,3);
assert.equal(evidenceCandidate.steps.length,206);
assert.deepEqual({evidenceCatalogue,evidenceCandidate},evidenceBefore);
assert.equal(evidenceCandidate.requestContext,undefined);
console.log('Scouter independent name/visibility overlays passed');
