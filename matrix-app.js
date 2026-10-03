let NODES = [], statNodes = [];
let nodeByShort = {};
import { setTrackerCatalogue } from './planner.js';
setTrackerCatalogue([]);
import { displayPriorityRows, matrixTotals, nextCheckpoint } from './planner.js';
import { previewCatalog } from './preview-priorities.js';
import { createClassLoader } from './class-loader.js';
import { fragmentDays, fragmentDuration, effectiveDailyFragments, normaliseDungeon } from './fragment-calculator.js';
import { restoreStatLines, statProgress, validateStatLines } from './hexa-stat.js';
import { createDecorations } from './decorations.js';
import { createMusic } from './music.js';
import { createInfographic } from './infographic.js';
import { createInfographicHelper } from './infographic-helper.js';
import { infographicCheckpoints, infographicDisplayCheckpoints, infographicContext, clickInfographicCheckpoint, reconcileInfographicUndo, invalidateInfographicUndo, reconcileStatCompletion } from './infographic-progress.js';

import { captureSkillProgress, createProgressUndo, restoreProgressHistory } from './progress-undo.js';
import { createSaveUI } from './save-ui.js';
import { PLAYER_CLASSES } from './player-backup.js';
import { createSaveActions } from './save-actions.js';
import { createPriorityRenderer } from './priority-renderer.js';
import { createMatrixRenderer } from './matrix-renderer.js';

const PLAYER_CLASS_NAMES={hoyoung:'Hoyoung',ren:'Ren'};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let appReady=false;
const saveUI=createSaveUI({
  document,window,getStorage:()=>localStorage,isReady:()=>appReady,
  getContext:()=>({key:storageKey,className:activeClass,sourcePaused:sourcePaused(),pending:saveActionPending}),
  classes:PLAYER_CLASSES,classNames:PLAYER_CLASS_NAMES,onPause:syncPausedControls
});
const playerStorage=saveUI.storage;
let activeClass='hoyoung';
try {activeClass=new URL(location.href).searchParams.get('class') || playerStorage.readPreference('hexa-tracker-class-v1') || 'hoyoung';}catch{}
if(!['hoyoung','ren'].includes(activeClass))activeClass='hoyoung';
$('#class').value=activeClass;
document.documentElement.dataset.class=activeClass;
const decorations=createDecorations({document,window,control:$('#animations'),className:activeClass});
const music=createMusic({document,window,control:$('#music-control'),slider:$('#music-volume'),output:$('#music-level'),className:activeClass});
let storageKey='hexa-tracker-'+activeClass+'-v1';
let refreshSequence=0;
let classLoading=true, classLoadFailed=false, saveActionPending=false;
let verifiedClass=null;
const pausedControls=new Map();
const progressControls='#patch, #priority-version, [name="world"], [data-node], [data-stat-line], [data-stat-segment], [data-stat-unlocked], [data-stat-select], [data-stat-cancel], #next-upgrade button:not([data-fd-note]), [data-checkpoint], #owned, #perday, #erdaRequest, #epicDungeon, #includeJanus, #hideDone, #reset, #undo-progress, #import-progress, #import-progress-file';
const sourcePaused=()=>classLoading || classLoadFailed;
const editsPaused=()=>sourcePaused() || saveActionPending || playerStorage.conflict(storageKey);
function syncConflict() {saveUI.syncConflict();}
function checkActive() {return saveUI.checkActive();}
saveUI.observe();
function syncPausedControls() {
  if(editsPaused()) {
    $$(progressControls).forEach(control=>{
      if(!pausedControls.has(control))pausedControls.set(control,control.disabled);
      control.disabled=true;
    });
  }else {
    for(const [control,disabled] of pausedControls)control.disabled=disabled;
    pausedControls.clear();
  }
  syncProgressUndo();
}

const classLoader=createClassLoader();
const selectedStats={};
const initialLevel=node=>node.initialLevel ?? (node.short==='Apotheosis'?1:0);
let saved=playerStorage.read(storageKey);
let previewDrafts = {};
let catalog = previewCatalog(previewDrafts);
const requestedMode = new URL(location.href).searchParams.get('mode');
let initialSharedLoad = true;
if (requestedMode && catalog.settings[requestedMode]?.enabled && catalog.priorities[requestedMode]?.length) saved.mode = requestedMode;

let view='tracker';
try { if(playerStorage.readPreference('hexa-tracker-view-v1')==='infographic')view='infographic';
  $('#infographic-hide').checked=playerStorage.readPreference('hexa-tracker-infographic-hide-v1')==='true'; }catch{}
let infographicEntries=[], infographicScope=null;
const progressUndo=createProgressUndo();
let pendingProgressEdit=null;
function undoScope() {
  return JSON.stringify([activeClass, infographicScope, [...NODES,...statNodes].map(node=>
    [node.id || node.short,node.short,initialLevel(node),node.maxLevel ?? (statNodes.includes(node)?20:30)])]);
}
function syncProgressUndo() {
  const action=progressUndo.current(saved,undoScope());
  $('#undo-progress').disabled=editsPaused() || !action;
  $('#undo-progress').setAttribute('aria-label',action ? `Undo last progress edit for ${action.label}` : 'Undo last progress edit');
}
function clearProgressUndo() {
  pendingProgressEdit=null;progressUndo.clear();syncProgressUndo();
  $('#undo-status').textContent='';
}
function beginProgressEdit(input,skill) {
  if(pendingProgressEdit?.input!==input) {
    $('#undo-status').textContent='';
    const node=[...NODES,...statNodes].find(node=>node.short===skill);
    pendingProgressEdit={input,skill,label:node?.name || skill,scope:undoScope(),before:captureSkillProgress(saved,skill),previous:progressUndo.current(saved,undoScope())};
  }
  return pendingProgressEdit;
}
function finishProgressEdit(edit,finished=false) {
  const after=captureSkillProgress(saved,edit.skill);
  if(!progressUndo.record({...edit,after})) {
    // Typing back to the starting value is no action. Keep the earlier Undo.
    restoreProgressHistory(saved,edit.before.history,undoContexts());
    if(Object.keys(edit.before.history).length)playerStorage.write(storageKey,saved);
    progressUndo.clear();
    if(edit.previous)progressUndo.record(edit.previous);
  }
  if(finished)pendingProgressEdit=null;
  syncProgressUndo();
}
function undoContexts() {
  const nodes=[...NODES.map(node=>({...node,initialLevel:initialLevel(node)})),...statNodes.map(node=>({...node,isStat:true,maxLevel:node.maxLevel ?? 20}))];
  return Object.fromEntries(Object.entries(catalog.priorities).map(([mode,order])=>{
    const entries=infographicCheckpoints(order.filter(step=>!nodeByShort[step.skill]?.isJanus),nodes);
    return [mode,{entries,context:infographicContext(mode,entries)}];
  }));
}
$('#undo-progress').addEventListener('click',()=>{
  if(editsPaused())return;
  const step=progressUndo.restore(saved,undoScope(),undoContexts());
  if(!step)return;
  pendingProgressEdit=null;
  const input=$$('[data-node]').find(input=>input.dataset.node===step.skill);
  if(input)input.value=saved.levels[step.skill];
  const row=$$('[data-stat]').find(output=>output.dataset.stat===step.skill)?.closest('.stat-row');
  if(row) {
    const unlocked=row.querySelector('[data-stat-unlocked]');
    unlocked.checked=saved.statUnlocked?.[step.skill]===true || saved.levels?.[step.skill]>0;
    row.querySelectorAll('[data-stat-line]').forEach((field,index)=>{
      field.value=saved.statLines?.[step.skill]?.[index] ?? '';statEntryDrafts.set(field,field.value);
      field.setCustomValidity('');field.setAttribute('aria-invalid','false');
    });
  }
  render();syncProgressUndo();
  $('#undo-status').textContent=`Restored previous progress for ${step.label}.`;
});
// A focus session is one edit, even though valid input previews save live.
document.addEventListener('focusout',event=>{
  if(pendingProgressEdit?.input===event.target)pendingProgressEdit=null;
});
const infographic=createInfographic({document,window,grid:$('#infographic-grid'),onClick:key=>{
  if(editsPaused() || !infographicScope || !clickInfographicCheckpoint(saved,infographicScope,infographicEntries,key))return;
  clearProgressUndo();
  const entry=infographicEntries.find(entry=>entry.key===key);
  if(entry.stat) {
    const row=$$('[data-stat]').find(output=>output.dataset.stat===entry.skill)?.closest('.stat-row');
    if(row) {
      row.querySelector('[data-stat-unlocked]').checked=saved.statUnlocked[entry.skill];
      row.querySelectorAll('[data-stat-line]').forEach((input,index)=>{
        input.value=saved.statLines[entry.skill]?.[index] ?? '';statEntryDrafts.set(input,input.value);
        input.setCustomValidity('');input.setAttribute('aria-invalid','false');
      });
    }
  }else {
    const input=$$('[data-node]').find(input=>input.dataset.node===entry.skill);
    if(input)input.value=saved.levels[entry.skill];
  }
  render();
}});
function syncView() {
  $('.workspace').dataset.view=view;
  $('.infographic-panel').hidden=view!=='infographic';
  $('#view-tracker').setAttribute('aria-pressed',String(view==='tracker'));
  $('#view-infographic').setAttribute('aria-pressed',String(view==='infographic'));
}
for(const name of ['tracker','infographic'])$('#view-'+name).addEventListener('click',()=>{
  view=name;if(view==='infographic')selectedStats[activeClass]=null;
  try{playerStorage.writePreference('hexa-tracker-view-v1',view);}catch{}
  syncView();render();
});
$('#infographic-hide').addEventListener('change',()=>{
  try{playerStorage.writePreference('hexa-tracker-infographic-hide-v1',String($('#infographic-hide').checked));}catch{}
});
syncView();

const {renderPriority, checkMaterialIcons}=createPriorityRenderer({document});
const statImageHandlers=new WeakSet();
const matrixRenderer=createMatrixRenderer({document, checkMaterialIcons});
const helper=createInfographicHelper({document,grid:$('#infographic-grid'),control:$('#infographic-helper'),panel:$('#helper-panel'),
  readPreference:key=>playerStorage.readPreference(key),writePreference:(key,value)=>playerStorage.writePreference(key,value)});
function syncHelper() {
  helper.update({nodes:NODES,stats:statNodes,
    available:new Set(infographicEntries.map(entry=>entry.skill)),visible:view==='infographic' && !!infographicScope,
    context:JSON.stringify([activeClass,infographicScope])});
}

function clamp(value, max, min = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : min;
}

function levelRange(input) {
  return { min: Number(input.min), max: Number(input.max) };
}

function validLevel(input) {
  const { min, max } = levelRange(input);
  return clamp(input.value, max, min);
}

function syncPriorityOptions() {
  const select = $('#patch');
  const world = $('[name="world"]:checked').value;
  const available = Object.keys(catalog.priorities).filter(mode => catalog.priorities[mode].length && catalog.settings[mode]?.enabled);
  const updates = new Map(available.map(mode => [catalog.settings[mode].selectionId, catalog.settings[mode].selectionName]));
  const previousUpdate = select.value || catalog.settings[saved.mode]?.selectionId;
  const options = [...updates];
  if (options.length !== select.options.length || options.some(([id,name],index)=>select.options[index].value !== id || select.options[index].textContent !== name)) {
    select.replaceChildren(...options.map(([id,name]) => new Option(name,id)));
  }
  select.value = updates.has(previousUpdate) ? previousUpdate : options[0]?.[0] || '';
  const modes = available.filter(mode => catalog.settings[mode].world === world && catalog.settings[mode].selectionId === select.value);
  const versions = $('#priority-version');
  const previousVersion = saved.mode || versions.value;
  if(modes.length!==versions.options.length || modes.some((mode,index)=>versions.options[index].value!==mode || versions.options[index].textContent!==catalog.labels[mode])) {
    versions.replaceChildren(...modes.map(mode => new Option(catalog.labels[mode], mode)));
  }
  $('#version-picker').hidden = modes.length < 2;
  versions.value = modes.includes(previousVersion) ? previousVersion : modes[0] || '';
  return versions.value;
}

function renderInputs() {
  matrixRenderer.renderInputs({nodes:NODES, statNodes, saved, draft:previewDrafts[saved.mode],
    catalog, classLoading, classLoadFailed, initialLevel, clamp, syncPriorityOptions,
    restoreLines:skill=>{
      const lines=restoreStatLines(saved.statLines?.[skill], clamp(saved.levels?.[skill],20));
      if(!playerStorage.conflict(storageKey))saved.statLines={...saved.statLines,[skill]:lines};
      return lines;
    }});
}

function levels() {
  const result = { ...saved.levels };
  $$('[data-node]').forEach(input => { result[input.dataset.node] = validLevel(input); });
  $$('[data-stat]').forEach(output => {
    const skill=output.dataset.stat;
    result[skill]=statProgress(saved.statLines?.[skill], clamp(saved.levels?.[skill],20), saved.statCompleted?.[skill] === true).total;
  });
  return result;
}

function syncStatSelection(available) {
  selectedStats[activeClass]=matrixRenderer.syncStatSelection({statNodes, available, selected:selectedStats[activeClass]});
}

function syncStatVisuals(skill,row) {
  matrixRenderer.syncStatVisuals({skill, row, statNodes, saved, selected:selectedStats[activeClass]});
}

$('.stat-list').addEventListener('click',event=>{
  if(event.target.closest('[data-fd-note]'))return;
  if(editsPaused())return;
  const selector=event.target.closest('[data-stat-selector]');
  if(!selector)return;
  const skill=selector.dataset.statSelector;
  if(event.target.closest('[data-stat-cancel]')){
    const unlocked=$$('[data-stat-unlocked]').find(field=>field.dataset.statUnlocked===skill);
    const lines=saved.statLines?.[skill];
    if(!unlocked.disabled&&validateStatLines(lines).complete&&lines.every(level=>level===0)){
      const edit=beginProgressEdit(unlocked,skill);
      invalidateInfographicUndo(saved,skill);unlocked.checked=false;
      render();finishProgressEdit(edit,true);return;
    }
  }else{
    selectedStats[activeClass]=selectedStats[activeClass]===skill ? null : skill;
  }
  render();
});

function highlightCurrentSkill(skill) {matrixRenderer.highlightCurrentSkill(skill);}

const fdDialog=$('#fd-explanation');
let fdOpener=null,fdContext=null;
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-fd-note]');
  if(!button)return;
  fdOpener=button;fdContext={className:activeClass,mode:saved.mode,view,key:button.dataset.fdKey};
  $('#fd-explanation-text').textContent=button.dataset.fdNote;
  fdDialog.showModal();
});
$('#fd-explanation-close').addEventListener('click',()=>fdDialog.close());
fdDialog.addEventListener('close',()=>{
  const sameContext=fdContext?.className===activeClass && fdContext?.mode===saved.mode && fdContext?.view===view;
  const usable=button=>button?.isConnected && !button.disabled && !button.closest('[hidden]');
  const replacement=sameContext && fdContext?.key && $$('[data-fd-key]').find(button=>button.dataset.fdKey===fdContext.key && usable(button));
  const target=sameContext && usable(fdOpener) ? fdOpener : replacement || $('#view-'+view);
  target?.focus();
  fdOpener=null;fdContext=null;
});

function render(allowConflict=false) {
  checkActive();
  syncView();
  // A failed refresh keeps the verified DOM and saved state read-only.
  // View/visibility preferences can still change without writing progress.
  if((playerStorage.conflict(storageKey) && !allowConflict) || (sourcePaused() && verifiedClass===activeClass)) {
    if(view==='infographic' && infographicScope)infographic.render(infographicDisplayCheckpoints(infographicEntries,saved,infographicScope),saved,infographicScope,$('#infographic-hide').checked);
    syncHelper();
    syncPausedControls();
    return;
  }
  const mode = syncPriorityOptions();
  const heroic = $('[name="world"]:checked').value === 'heroic';
  $('.calculator-panel').hidden = !heroic;
  $('.quickstats').hidden = !heroic;
  const order = (catalog.priorities[mode] || []).filter(step=>!nodeByShort[step.skill]?.isJanus);
  // A capture's catalogue can contain skills that its priority never uses.
  // Keep their inputs and progress. Janus is always available as an optional
  // material-only input and never contributes to the priority order.
  const available = new Set(order.map(step => step.skill));
  $$('[data-node-row]').forEach(row => { row.hidden = !nodeByShort[row.dataset.nodeRow]?.isJanus && !available.has(row.dataset.nodeRow); });
  $$('.node-group').forEach(group => { group.hidden = !group.querySelector('[data-node-row]:not([hidden])'); });
  syncStatSelection(available);
  $('#stat-heading').hidden = !statNodes.some(node => available.has(node.short));
  $('#includeJanus').closest('.include-option').hidden = false;
  $('#includeJanus').disabled=true;
  $('#includeJanus').title='Captured Sol Hecate costs unavailable for this selection';
  infographicEntries=infographicCheckpoints(order,[...NODES.map(node=>({...node,initialLevel:initialLevel(node)})),...statNodes.map(node=>({...node,isStat:true,maxLevel:node.maxLevel ?? 20}))]);
  infographicScope=infographicContext(mode,infographicEntries);
  if(pendingProgressEdit && pendingProgressEdit.scope!==undoScope())pendingProgressEdit=null;
  syncProgressUndo();
  setTrackerCatalogue([]);
  if (!mode) {
    highlightCurrentSkill(null);
    $('#version-name').textContent = `${$('#patch').selectedOptions[0]?.textContent || 'Update'} / ${$('[name="world"]:checked').value === 'heroic' ? 'Fragments' : 'Sol Erda'}`;
    $('#progress').textContent = classLoading ? 'Loading...' : 'No saved priority is visible for this selection';
    $('#next-upgrade').textContent = classLoading ? 'Loading...' : 'No saved priority is available for this update and world.';
    $('#priority').replaceChildren();
    $('#totals').replaceChildren();
    $('#completion').replaceChildren();
    $('#time-estimate').hidden = true;
    infographicEntries=[];infographicScope=null;infographic.clear();
    helper.clear();
    $('#infographic-context').textContent='';
    $('#infographic-message').textContent=classLoading?'Loading...':classLoadFailed?'Priorities could not be loaded.':'No saved priority is available for this selection.';
    checkMaterialIcons();
    return;
  }
  const sourceMode = previewDrafts[mode]?.sourceMode || mode;
  const captured = previewDrafts[mode]?.capturedCosts;
  if (!captured) {
    $('#next-upgrade').innerHTML = '<div class="metric"><strong>Captured level costs unavailable</strong><p>Grab Scouter info and save a new priority pair in the Admin Panel.</p></div>';
    $('#priority').replaceChildren(); $('#totals').replaceChildren(); $('#completion').replaceChildren();
    $('#time-estimate').hidden = true; highlightCurrentSkill(null);
    infographic.clear();$('#infographic-message').textContent='Captured level costs unavailable. Grab Scouter info and save a new priority pair in the Admin Panel.';
    helper.clear();
    return;
  }
  // Owner-confirmed Janus costs equal Hecate. Use this selection's captured
  // schedule, without changing the source capture or priority order.
  const janus=NODES.find(node=>node.isJanus);
  const hecate=NODES.find(node=>node.sourceKey==='generalCore2' || node.short==='Hecate');
  const janusCosts=captured[janus?.short] || captured[hecate?.short];
  $('#includeJanus').disabled=!janusCosts;
  $('#includeJanus').title=janusCosts ? '' : 'Captured Sol Hecate costs unavailable for this selection';
  setTrackerCatalogue(NODES.filter(node=>node.isJanus ? !!janusCosts : available.has(node.short) && captured[node.short]).map(node => {
    const cost=node.isJanus ? janusCosts : captured[node.short];
    return {...node,costs:cost.levels,initialLevel:cost.freeBaseLevel};
  }));
  const current = levels();
  const statUnlocked = {};
  $$('[data-stat-unlocked]').forEach(input => {
    const skill = input.dataset.statUnlocked;
    if (current[skill] > 0) input.checked = true;
    input.disabled = current[skill] > 0;
    statUnlocked[skill] = input.checked;
  });
  const { steps, index, completed, next } = nextCheckpoint(current, sourceMode, order);
  const owned = clamp($('#owned').value, 9999999);
  const perday = clamp($('#perday').value, 9999999);
  const erdaRequest = $('#erdaRequest').value === 'yes';
  const epicDungeon = normaliseDungeon($('#epicDungeon').value);
  const rate = effectiveDailyFragments(perday, erdaRequest, epicDungeon);
  const days = cost => heroic && !cost.rng ? fragmentDays(cost.frags, owned, rate) : null;
  const duration = cost => fragmentDuration(days(cost), perday);
  const inventory = heroic ? owned : null;
  const includeJanus = $('#includeJanus').checked;
  const matrix = matrixTotals(current, sourceMode, includeJanus, statUnlocked, order);
  const displayRows = displayPriorityRows(current, sourceMode, order, statUnlocked);
  const nextRow = displayRows.find(row => !row.done && row.index <= index + 1 && index + 1 <= row.endIndex);
  highlightCurrentSkill(nextRow?.skill);
  $('#version-name').textContent = `${catalog.settings[mode].selectionName} / ${catalog.settings[mode].world === 'heroic' ? 'Fragments (Heroic)' : 'Sol Erda (Interactive)'}`;
  $('#progress').textContent = steps.length ? `${completed} / ${steps.length} complete` : 'Maple Scouter order pending';
  renderPriority({nodeByShort, statNodes, draft:previewDrafts[mode], order, current,
    next, index, steps, displayRows, nextRow, statUnlocked, duration, inventory,
    hideDone:$('#hideDone').checked});
  $$('.stat-icon').forEach(img => { if(!statImageHandlers.has(img)){statImageHandlers.add(img);img.addEventListener('error', () => { img.hidden = true; });} });
  $('.priority-table').classList.toggle('hide-done', $('#hideDone').checked);
  matrixRenderer.renderSummary({matrix, heroic, rate, days, duration});
  matrixRenderer.renderProgress({draft:previewDrafts[mode], saved, current, nodeByShort,
    statNodes, selected:selectedStats[activeClass]});
  if(!playerStorage.conflict(storageKey)) {
  saved = { statCompleted:saved.statCompleted || {}, infographicUndo:saved.infographicUndo || {}, mode, levels: current, statUnlocked: {...saved.statUnlocked,...statUnlocked}, statLines: saved.statLines || {}, owned, perday, erdaRequest, epicDungeon, hideDone: $('#hideDone').checked, includeJanus };
  reconcileInfographicUndo(saved,infographicScope,infographicEntries);
  }
  $('#infographic-context').textContent=`${$('#class').selectedOptions[0]?.textContent || activeClass} / ${$('#version-name').textContent}`;
  $('#infographic-message').textContent=infographicEntries.length ? '' : 'No checkpoints are available for this priority.';
  if(view==='infographic')infographic.render(infographicDisplayCheckpoints(infographicEntries,saved,infographicScope),saved,infographicScope,$('#infographic-hide').checked);
  syncHelper();
  if(!playerStorage.conflict(storageKey))playerStorage.write(storageKey,saved);
  syncPausedControls();
}

const statEntryDrafts=new WeakMap();
function acceptStatEntry(input) {
  const previous=statEntryDrafts.has(input)?statEntryDrafts.get(input):String(saved.statLines?.[input.dataset.statLine]?.[Number(input.dataset.lineIndex)] ?? '');
  if(input.value!=='' && (!Number.isFinite(Number(input.value)) || Number(input.value)<0 || Number(input.value)>10)) {
    input.value=previous;return false;
  }
  if(!input.validity.badInput)statEntryDrafts.set(input,input.value);
  return true;
}
const numericProgressInputs='[data-node], [data-stat-line], #owned, #perday';
function selectNumericValue(event) {
  if(event.target.matches(numericProgressInputs) && !event.target.disabled)event.target.select();
}
document.addEventListener('focusin',selectNumericValue);
document.addEventListener('click',selectNumericValue);
$('.stat-list').addEventListener('click',event=>{
  const segment=event.target.closest('[data-stat-segment]');
  if(!segment || segment.disabled || editsPaused())return;
  const input=segment.closest('.stat-line').querySelector('[data-stat-line]');
  if(input.disabled)return;
  // Each segment activation is an ordinary, independently undoable line edit.
  pendingProgressEdit=null;
  input.value=segment.dataset.statSegment;
  statEntryDrafts.set(input,input.value);
  updateStatLine(input);pendingProgressEdit=null;
});
function updateStatLine(input) {
  const skill=input.dataset.statLine, row=input.closest('.stat-row');
  const lines=[...row.querySelectorAll('[data-stat-line]')].map(field => field.value === '' ? (field.validity.badInput ? NaN : null) : Number(field.value));
  const checked=validateStatLines(lines);
  row.querySelectorAll('[data-stat-line]').forEach(field => {
    field.setCustomValidity(checked.valid ? '' : checked.error);
    field.setAttribute('aria-invalid', String(!checked.valid));
  });
  if (!checked.valid) {
    row.querySelector('.stat-note').textContent=checked.error;
    // Invalid drafts never change saved progress or display a stale FD.
    row.querySelector('.stat-fd').textContent='';
    syncStatVisuals(skill,row);
    return;
  }
  const edit=beginProgressEdit(input,skill);
  const sameLines=JSON.stringify(lines)===JSON.stringify(saved.statLines?.[skill]);
  const unlockChanges=input.value!=='' && !row.querySelector('[data-stat-unlocked]').checked;
  const markChanges=checked.complete && saved.statCompleted?.[skill]===true;
  if(sameLines && !unlockChanges && !markChanges) {render();finishProgressEdit(edit);return;}
  invalidateInfographicUndo(saved,skill);
  reconcileStatCompletion(saved,skill,lines);
  saved.statLines={...saved.statLines,[skill]:lines};
  if(input.value!=='')row.querySelector('[data-stat-unlocked]').checked=true;
  render();finishProgressEdit(edit);
}
const renderSettings='#patch, #priority-version, [name="world"], #owned, #perday, #erdaRequest, #epicDungeon, #includeJanus, #hideDone, #infographic-hide';
document.addEventListener('input', event=>{
  if(editsPaused())return;
  if(event.target.matches('[data-stat-line]')) {if(acceptStatEntry(event.target))updateStatLine(event.target);return;}
  if(event.target.matches('[data-node]')) {
    const edit=beginProgressEdit(event.target,event.target.dataset.node);
    if(validLevel(event.target)!==saved.levels?.[edit.skill])invalidateInfographicUndo(saved,edit.skill);
    render();finishProgressEdit(edit);return;
  }
  if(event.target.matches(renderSettings))render();
});
document.addEventListener('change', event => {
  if(editsPaused()){if(event.target.id==='infographic-hide')render();return;}
  if(['class','music-volume'].includes(event.target.id))return;
  if(event.target.matches('[data-stat-line]')) {
    if(acceptStatEntry(event.target))updateStatLine(event.target);pendingProgressEdit=null;return;
  }
  if(event.target.matches('[data-node], [data-stat-unlocked]')) {
    const edit=beginProgressEdit(event.target,event.target.dataset.node || event.target.dataset.statUnlocked);
    const changed=event.target.matches('[data-node]') ? validLevel(event.target)!==saved.levels?.[edit.skill] : event.target.checked!==saved.statUnlocked?.[edit.skill];
    if(changed)invalidateInfographicUndo(saved,edit.skill);
    if(event.target.matches('[data-node]'))event.target.value=validLevel(event.target);
    render();finishProgressEdit(edit,true);return;
  }
  if(event.target.matches(renderSettings))render();
});
$('#next-upgrade').addEventListener('click', event => {
  if(editsPaused())return;
  const button = event.target.closest('button[data-upgrade-skill]');
  if (!button || !$('#next-upgrade').contains(button)) return;
  if (button.dataset.statAction) {
    const stat = [...$$('[data-stat]')].find(field => field.dataset.stat === button.dataset.upgradeSkill);
    const unlocked = [...$$('[data-stat-unlocked]')].find(field => field.dataset.statUnlocked === button.dataset.upgradeSkill);
    if (!stat || !unlocked) return;
    pendingProgressEdit=null;
    if (button.dataset.statAction === 'unlock' && !unlocked.checked && !unlocked.disabled) {
      unlocked.checked = true;
      unlocked.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (button.dataset.statAction === 'lines' && unlocked.checked) {
      selectedStats[activeClass]=button.dataset.upgradeSkill;
      syncStatSelection(new Set((catalog.priorities[saved.mode] || []).map(step=>step.skill)));
      const primary=stat.closest('.stat-row').querySelector('[data-stat-line]');
      primary.scrollIntoView?.({block:'center',behavior:'smooth'});
      primary.focus();
    }
    return;
  }
  const input = [...$$('[data-node]')].find(field => field.dataset.node === button.dataset.upgradeSkill);
  if (!input) return;
  const current = validLevel(input);
  const target = button.dataset.nextLevel ? Math.min(current + 1, Number(input.max)) : clamp(button.dataset.upgradeLevel, Number(input.max), Number(input.min));
  if (target <= current) return;
  pendingProgressEdit=null;
  input.value = target;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  pendingProgressEdit=null;
});

const saveActions=createSaveActions({
  document,playerStorage,classLoader,classNames:PLAYER_CLASS_NAMES,
  getState:()=>({key:storageKey,className:activeClass,sequence:refreshSequence,pending:saveActionPending,progress:saved}),
  sourcePaused,editsPaused,
  setPending:pending=>{saveActionPending=pending;syncConflict();},
  setSaved:progress=>{saved=progress;},
  clearSelectedStat:()=>{selectedStats[activeClass]=null;},
  clearProgressUndo,renderInputs,render,syncConflict
});
async function refreshSharedPriorities({force=false}={}) {
  checkActive();
  if(playerStorage.conflict(storageKey) && verifiedClass===activeClass){syncConflict();return;}
  const hadView=verifiedClass===activeClass;
  const classAtStart=activeClass,sequence=++refreshSequence;
  const focused=document.activeElement;
  let focusMoved=false;
  const observeFocus=event=>{if(event.target!==focused && event.target!==document.body && event.target!==document.documentElement)focusMoved=true;};
  document.addEventListener('focusin',observeFocus);
  $('#retry-priorities').hidden=true;
  pendingProgressEdit=null;
  classLoading=true;classLoadFailed=false;
  if(verifiedClass!==activeClass){renderInputs();render();}
  syncPausedControls();
  $('#priority-sync').textContent=verifiedClass===activeClass ? 'Refreshing data. Showing the last loaded view. Progress edits are paused.' : '';
  try {
    const cached=force ? null : classLoader.cached(classAtStart);
    const snapshot=cached || await classLoader.request(classAtStart);
    if(classAtStart!==activeClass||sequence!==refreshSequence)return;
    classLoading=false;classLoadFailed=false;syncPausedControls();
    verifiedClass=activeClass;
    const {model,drafts}=snapshot;
    const unchanged=hadView && JSON.stringify([NODES,statNodes,previewDrafts])===JSON.stringify([model.nodes,model.stats,drafts]);
    NODES=model.nodes;statNodes=model.stats;nodeByShort=Object.fromEntries(NODES.map(node=>[node.short,node]));setTrackerCatalogue(NODES);
    previewDrafts=drafts;catalog=previewCatalog(drafts);
    if (initialSharedLoad && requestedMode && catalog.settings[requestedMode]?.enabled && catalog.priorities[requestedMode]?.length) saved.mode = requestedMode;
    initialSharedLoad = false;
    if (catalog.settings[saved.mode]) $('#patch').value = catalog.settings[saved.mode].selectionId;
    if(!unchanged && (!playerStorage.conflict(storageKey) || !hadView))renderInputs();
    render(!hadView);syncConflict();$('#priority-sync').textContent = '';
    // Disabling an editor during refresh can move native focus to the body.
    // Restore only the retained editor, never a new class or deliberate focus move.
    if(unchanged && !focusMoved && focused?.isConnected && focused.matches(progressControls) && !focused.disabled &&
      [document.body,document.documentElement,focused].includes(document.activeElement))focused.focus();
  } catch (error) {
    classLoader.invalidate(classAtStart);
    if(classAtStart!==activeClass||sequence!==refreshSequence)return;
    classLoading=false;classLoadFailed=true;
    if(verifiedClass!==activeClass) {
      NODES=[];statNodes=[];nodeByShort={};setTrackerCatalogue([]);
      previewDrafts={};catalog=previewCatalog({});renderInputs();render();
    }
    syncPausedControls();
    $('#retry-priorities').hidden=false;
    $('#priority-sync').textContent = verifiedClass===activeClass
      ? `Refresh failed: ${error.message}. Showing the last loaded view. Progress edits are paused. Check your connection, then retry.`
      : `Shared priorities could not be loaded: ${error.message}. Check your connection, then retry.`;
  }finally{document.removeEventListener('focusin',observeFocus);}
}
$('#retry-priorities').addEventListener('click',()=>refreshSharedPriorities({force:true}));
$('#class').addEventListener('change',()=>{
  clearProgressUndo();
  classLoading=false;classLoadFailed=false;syncPausedControls();verifiedClass=null;
  activeClass=$('#class').value;selectedStats[activeClass]=null;document.documentElement.dataset.class=activeClass;storageKey='hexa-tracker-'+activeClass+'-v1';
  decorations.setClass(activeClass);
  music.setClass(activeClass);
  playerStorage.writePreference('hexa-tracker-class-v1',activeClass);
  saved=playerStorage.read(storageKey);
  classLoading=true;classLoadFailed=false;$('#priority-sync').textContent='';
  previewDrafts={};catalog=previewCatalog({});NODES=[];statNodes=[];nodeByShort={};
  infographic.clear();infographicEntries=[];infographicScope=null;
  setTrackerCatalogue([]);$('#patch').replaceChildren();renderInputs();render();refreshSharedPriorities();
});
window.addEventListener('focus',()=>{
  checkActive();
  if(saveActions.pickingFile())return;
  if(verifiedClass===activeClass && classLoader.cached(activeClass))return;
  refreshSharedPriorities({force:true});
});
saveActions.bindReset();
appReady=true;
renderInputs();
render();syncConflict();

refreshSharedPriorities();
