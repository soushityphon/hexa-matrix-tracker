// Pure review records. No tracker catalogue, network, storage or promotion.
import {discoverySelection} from './scouter-discovery.js';

const core = /^(?:(?:skillCore|masteryCore|reinCore|generalCore)[1-9]\d*|hexaStat[1-3])$/;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function label(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Enter a nonempty review label');
  return value.trim();
}
function identity(skill) {
  if (!core.test(skill?.coreId) || typeof skill.sourceName !== 'string' || !skill.sourceName) throw new Error('Source skill identity required');
  const icon = skill.icon;
  if (typeof icon !== 'string' || !(/^https:\/\/maplescouter\.com\/hexaskill\/[\w/.-]+\.png$/.test(icon) ||
      /^https:\/\/open\.api\.nexon\.com\/static\/maplestory\/skill\/icon\/[A-Za-z0-9_-]+$/.test(icon)) || icon.includes('..')) throw new Error('Source skill icon required');
  return {coreId:skill.coreId,sourceName:skill.sourceName,icon};
}
function inventory(catalogue, candidate) {
  if (typeof catalogue?.job !== 'string' || !catalogue.job || !Array.isArray(catalogue.skills)) throw new Error('Source catalogue required');
  const skills = catalogue.skills.map(skill => ({...identity(skill),
    icon:identity({...skill,icon:catalogue.sourceIconOverrides?.[skill.coreId] || skill.icon}).icon}));
  if (candidate) {
    const selection = discoverySelection(candidate.selection?.region,candidate.selection?.world);
    if (candidate.job !== catalogue.job || catalogue.selection?.region !== selection.region || catalogue.selection?.world !== selection.world ||
        !Array.isArray(candidate.steps) || !candidate.steps.length) throw new Error('Candidate and catalogue scope differ');
    for (const step of candidate.steps) {
      const source = identity(step);
      const existing = skills.find(skill => skill.coreId === source.coreId);
      if (existing && !same(existing,source)) throw new Error('Candidate skill identity differs from catalogue');
      if (!existing) {
        if (!/^hexaStat[1-3]$/.test(source.coreId)) throw new Error('Candidate skill missing from catalogue');
        skills.push(source);
      }
    }
  }
  if (new Set(skills.map(skill => skill.coreId)).size !== skills.length) throw new Error('Duplicate source skill identity');
  return skills;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
  if (value === null || ['string','boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value))) return value;
  throw new Error('Finite review source data required');
}

// Called after an owner edits labels. Partial records are allowed so a new core
// can remain pending. Names are per job/core, never per mutable display name.
export function createScouterNameOverlay(catalogue, choices, candidate = null) {
  const skills = inventory(catalogue,candidate);
  if (!Array.isArray(choices)) throw new Error('Review name choices required');
  const names = choices.map(choice => {
    const source = skills.find(skill => skill.coreId === choice?.coreId);
    if (!source) throw new Error('Review name has no source skill');
    return {...source,longName:label(choice.longName),shortName:label(choice.shortName)};
  });
  if (new Set(names.map(name => name.coreId)).size !== names.length) throw new Error('Duplicate reviewed name');
  return {schema:1,namespace:'scouter-name-overlay',job:catalogue.job,names};
}

// Bind a visibility choice to the exact source candidate and catalogue. This
// is equality, not evidence of genuine requests, regional support or promotion.
export async function scouterReviewFingerprint(catalogue, candidate) {
  inventory(catalogue,candidate);
  if (!candidate) throw new Error('Source candidate required');
  // Snapshot before awaiting. Source-only acquisition outputs may contain empty
  // legacy reviewedOverrides; these never contribute to the review binding.
  const source = structuredClone({schema:1,scope:'scouter-order-review',
    catalogue:{job:catalogue.job,selection:catalogue.selection,skills:catalogue.skills,
      placeholders:catalogue.placeholders ?? [],sourceIconOverrides:catalogue.sourceIconOverrides ?? {},provenance:catalogue.provenance ?? {}},
    candidate:{job:candidate.job,selection:candidate.selection,source:candidate.source ?? {},steps:candidate.steps,
      issues:candidate.issues ?? null,requestContext:candidate.requestContext ?? null,provenance:candidate.provenance ?? null}});
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(source))));
  return Array.from(new Uint8Array(hash),byte => byte.toString(16).padStart(2,'0')).join('');
}
export async function createScouterOrderOverlay(catalogue, candidate, choice) {
  const name = label(choice?.name);
  if (typeof choice?.visible !== 'boolean') throw new Error('Choose order visibility explicitly');
  const visible = choice.visible;
  return {schema:1,namespace:'scouter-order-overlay',job:catalogue.job,
    sourceFingerprint:await scouterReviewFingerprint(catalogue,candidate),name,visible};
}

// Read-only projection for the future owner form. Never writes labels into
// source names/checkpoints or enables a candidate in the existing tracker.
export async function reviewScouterOverlays(catalogue, candidate, {nameOverlay,orderOverlay} = {}) {
  const source = structuredClone(catalogue), order = structuredClone(candidate);
  const names = structuredClone(nameOverlay), visibility = structuredClone(orderOverlay);
  const skills = inventory(source,order), blockers = [];
  if (names && (names.schema !== 1 || names.namespace !== 'scouter-name-overlay' || names.job !== source.job ||
      !Array.isArray(names.names) || new Set(names.names.map(name => name?.coreId)).size !== names.names.length)) throw new Error('Invalid name overlay scope');
  for (const name of names?.names || []) {identity(name);label(name.longName);label(name.shortName);}
  const rows = skills.map(skill => {
    const reviewed = names?.names.find(name => name.coreId === skill.coreId);
    const state = !reviewed ? 'missing' : !same(identity(reviewed),skill) ? 'source-changed' : 'reviewed';
    if (state !== 'reviewed') blockers.push({kind:'display-name',coreId:skill.coreId,state});
    return {...skill,state,longName:state === 'reviewed' ? label(reviewed.longName) : null,
      shortName:state === 'reviewed' ? label(reviewed.shortName) : null};
  });
  const inactiveNames = (names?.names || []).filter(name => !skills.some(skill => skill.coreId === name.coreId)).map(name => name.coreId);
  const fingerprint = await scouterReviewFingerprint(source,order);
  if (visibility && (visibility.schema !== 1 || visibility.namespace !== 'scouter-order-overlay' || visibility.job !== source.job ||
      typeof visibility.visible !== 'boolean' || !/^[a-f0-9]{64}$/.test(visibility.sourceFingerprint))) throw new Error('Invalid order overlay scope');
  if (visibility) label(visibility.name);
  const orderState = !visibility ? 'missing' : visibility.sourceFingerprint !== fingerprint ? 'source-changed' : 'reviewed';
  if (orderState !== 'reviewed') blockers.push({kind:'order-choice',state:orderState});
  if (!Array.isArray(order.issues) || order.issues.length) blockers.push({kind:'source-validation'});
  return {schema:1,namespace:'scouter-overlay-review',job:source.job,selection:discoverySelection(order.selection.region,order.selection.world),
    skills:rows,inactiveNames,order:{state:orderState,name:orderState === 'reviewed' ? label(visibility.name) : null,
      requestedVisible:orderState === 'reviewed' ? visibility.visible : false,sourceFingerprint:fingerprint},
    blockers,overlayReviewComplete:blockers.length === 0,publishable:false,
    limitations:['Overlay review does not validate request semantics or genuine benchmarks','Owner-only persistence and promotion are not connected']};
}
