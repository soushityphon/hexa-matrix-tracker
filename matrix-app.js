let NODES = [], statNodes = [];
let nodeByShort = {};
import { setTrackerCatalogue } from './planner.js';
setTrackerCatalogue([]);
import { combinedSourceGain, displayPriorityRows, matrixTotals, nextCheckpoint, rangeCost } from './planner.js';
import { previewCatalog } from './preview-priorities.js';
import { createClassLoader } from './class-loader.js';
import { skillAccent } from './skill-colours.js';
import { fragmentDays, fragmentDuration, fragmentCompletionDate, fragmentShortfall, effectiveDailyFragments, normaliseDungeon } from './fragment-calculator.js';
import { restoreStatLines, statProgress, validateStatLines } from './hexa-stat.js';
import { createDecorations } from './decorations.js';
import { createMusic } from './music.js';
import { createInfographic } from './infographic.js';
import { infographicCheckpoints, infographicDisplayCheckpoints, infographicContext, clickInfographicCheckpoint, reconcileInfographicUndo, invalidateInfographicUndo, reconcileStatCompletion } from './infographic-progress.js';

import { captureSkillProgress, createProgressUndo, restoreProgressHistory } from './progress-undo.js';
import { createPlayerStorage } from './player-storage.js';
import { createPlayerBackup, parsePlayerBackup, PLAYER_CLASSES } from './player-backup.js';

const PLAYER_CLASS_NAMES={hoyoung:'Hoyoung',ren:'Ren'};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let appReady=false;
const playerStorage=createPlayerStorage(()=>localStorage,({key,reason})=>{
  if(appReady && key!==storageKey)return;
  const status=$('#save-status');
  status.hidden=!reason || reason==='conflict';
  status.textContent=reason==='damaged'
    ? 'Saved progress is damaged. The original record is preserved. Changes stay in this session and cannot be saved until the record is recovered.'
    : reason==='unreadable'
    ? 'Saved progress could not be read. Changes stay in this session. Reload once browser storage is available to restore your saved progress.'
    : reason==='unsaved' ? 'Changes are not saved. Keep this tab open. Progress stays in this session while browser storage is unavailable.' : '';
  if(appReady)syncConflict();
},operation=>window.navigator.locks?.request
  ? window.navigator.locks.request('hexa-tracker-progress-v1',operation)
  : Promise.reject(new Error('Cross-tab saving is unavailable')));
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
const progressControls='#patch, #priority-version, [name="world"], [data-node], [data-stat-line], [data-stat-unlocked], [data-stat-select], [data-stat-cancel], #next-upgrade button:not([data-fd-note]), [data-checkpoint], #owned, #perday, #erdaRequest, #epicDungeon, #includeJanus, #hideDone, #reset, #undo-progress, #import-progress, #import-progress-file';
const sourcePaused=()=>classLoading || classLoadFailed;
const editsPaused=()=>sourcePaused() || saveActionPending || playerStorage.conflict(storageKey);
function syncConflict() {
  const conflict=playerStorage.conflict(storageKey);
  $('#save-conflict').hidden=!conflict;
  $('#conflict-message').textContent=conflict ? `Saved ${PLAYER_CLASS_NAMES[activeClass]} progress changed in another tab. Editing is paused.` : '';
  $('#load-latest-save').disabled=sourcePaused() || saveActionPending;
  $('#continue-tab-save').disabled=sourcePaused() || saveActionPending;
  syncPausedControls();
}
function checkActive() {return playerStorage.check(storageKey);}
// Input values may already contain an unfinished draft. Keep them visible, but
// detect an external write before any handler can mutate saved progress.
for(const type of ['input','change','click'])document.addEventListener(type,checkActive,true);
window.addEventListener('storage',event=>{
  if(event.key===null || event.key?.startsWith('hexa-tracker-')) {
    for(const name of Object.keys(PLAYER_CLASSES))playerStorage.check('hexa-tracker-'+name+'-v1');
    syncConflict();
  }
});
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
      field.value=saved.statLines?.[step.skill]?.[index] ?? '';
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
        input.value=saved.statLines[entry.skill]?.[index] ?? '';
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

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

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
  versions.replaceChildren(...modes.map(mode => new Option(catalog.labels[mode], mode)));
  $('#version-picker').hidden = modes.length < 2;
  if (modes.includes(previousVersion)) versions.value = previousVersion;
  return versions.value;
}

function renderInputs() {
  $('.stat-list').replaceChildren();
  const selectors=document.createElement('div');selectors.className='stat-selectors';
  $('.stat-list').append(selectors);
  $('#stat-heading').hidden = !statNodes.length;
  for (const node of statNodes) {
    const row=document.createElement('div');row.className='stat-row';
    row.style.setProperty('--skill-accent','var(--ui-accent)');
    const skill=escapeHtml(node.short);
    const lines=restoreStatLines(saved.statLines?.[node.short], clamp(saved.levels?.[node.short],20));
    if(!playerStorage.conflict(storageKey))saved.statLines={...saved.statLines,[node.short]:lines};
    const index=statNodes.indexOf(node);
    const selector=document.createElement('div');selector.className='stat-selector';selector.dataset.statSelector=node.short;
    selector.innerHTML=`<button type="button" class="stat-select" data-stat-select="${skill}" aria-controls="stat-panel-${index}" aria-expanded="false" aria-pressed="false"><span class="stat-unlock-icon"><img src="${escapeHtml(node.icon)}" alt=""></span><span class="stat-selector-name visually-hidden">${escapeHtml(node.name)}</span><span class="stat-mini-preview" aria-label="Saved line levels">${[0,1,2].map(line=>`<span class="stat-mini-line ${line===0?'stat-main':'stat-additional'}"><span class="stat-bar" aria-hidden="true">${Array.from({length:10},()=>'<i></i>').join('')}</span><span class="stat-mini-value"></span></span>`).join('')}</span></button><span class="stat-selector-summary"></span><button type="button" class="stat-cancel" data-stat-cancel="${skill}" aria-label="Cancel unlock for ${escapeHtml(node.name)}" title="Cancel unlock" hidden>×</button>`;
    selectors.append(selector);
    row.id=`stat-panel-${index}`;
    row.innerHTML=`<span class="stat-name visually-hidden">${escapeHtml(node.name)}</span><input data-stat-unlocked="${skill}" type="checkbox" hidden tabindex="-1" aria-hidden="true"><h3 class="stat-line-heading">Main Stat</h3><div class="stat-lines">${['Main Stat','2nd additional stat','3rd additional stat'].map((label,index)=>`${index===1?'<h3 class="stat-line-heading">Additional Stats</h3>':''}<label class="stat-line ${index===0?'stat-main':'stat-additional'}"><span class="visually-hidden">${label}</span><span class="stat-bar" aria-hidden="true">${Array.from({length:10},()=>'<i></i>').join('')}</span><input data-stat-line="${skill}" data-line-index="${index}" aria-label="${escapeHtml(node.name)} ${label} level" aria-describedby="stat-note-${statNodes.indexOf(node)}" type="number" min="0" max="10" step="1" value="${lines[index] ?? ''}"></label>`).join('')}</div><div class="stat-summary" hidden><span data-stat="${skill}"></span><span class="stat-fd"></span></div><p class="stat-note" id="stat-note-${statNodes.indexOf(node)}" aria-live="polite"></p>`;
    $('.stat-list').append(row);
  }
  const nodeRow = node => `<label class="node-row" style="--skill-accent:${skillAccent(node.short)}" data-node-row="${node.short}" data-node-id="${node.id}" title="${escapeHtml(node.name)}"><span class="node-icon"><span aria-hidden="true">${node.short[0]}</span><img src="${node.icon}" alt=""></span><span class="node-label">${node.tag ? `<span class="skill-tag">${escapeHtml(node.tag)}</span>` : ''}<span class="node-name">${escapeHtml(node.name)}</span></span><input data-node="${node.short}" aria-label="${escapeHtml(node.name)} level" type="number" min="${initialLevel(node)}" max="30" step="1" value="${clamp(saved.levels?.[node.short], 30, initialLevel(node))}"></label>`;
  const renderGroup = (group, label, descending) => {
    const category = {'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'}[group];
    const nodes = NODES.filter(node => (previewDrafts[saved.mode]?.skillCategories?.[node.short] || {'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'}[node.group]) === category);
    if (descending) nodes.reverse();
    return `<section class="node-group"><h3 class="group-label">${label}</h3>${nodes.map(nodeRow).join('')}</section>`;
  };
  $('#nodes').innerHTML = NODES.length ? `<div class="node-column">${renderGroup('Skill Nodes', 'Skill', true)}${renderGroup('Enhancement Nodes', 'Enhancement', false)}</div><div class="node-column">${renderGroup('Mastery Nodes', 'Mastery', true)}${renderGroup('Common Nodes', 'Common', false)}</div>` : `<p class="fine">${classLoading?'Loading...':classLoadFailed?'Skills could not be loaded.':'No skills saved. Populate and save Skills in the Admin Panel.'}</p>`;
  $$('.node-icon img').forEach(img => {
    img.addEventListener('error', () => { img.hidden = true; });
    if (img.complete && !img.naturalWidth) img.hidden = true;
  });
  $$('.stat-unlock-icon img').forEach(image => {
    image.addEventListener('error',()=>{image.hidden=true;});
  });
  $$('[data-stat-unlocked]').forEach(input => {
    const skill = input.dataset.statUnlocked;
    const level = clamp(saved.levels?.[skill], 20);
    input.checked = level > 0 || saved.statUnlocked?.[skill] === true;
    input.disabled = level > 0;
  });
  $(`[name="world"][value="${catalog.settings[saved.mode]?.world || 'heroic'}"]`).checked = true;
  syncPriorityOptions();
  $('#owned').value = saved.owned ?? 0;
  $('#perday').value = saved.perday ?? 0;
  $('#erdaRequest').value = saved.erdaRequest === true ? 'yes' : 'none';
  $('#epicDungeon').value = normaliseDungeon(saved.epicDungeon);
  $('#hideDone').checked = saved.hideDone !== false;
  $('#includeJanus').checked = saved.includeJanus === true;
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
  const choices=statNodes.filter(node=>available.has(node.short));
  if(selectedStats[activeClass]!==null&&!choices.some(node=>node.short===selectedStats[activeClass]))selectedStats[activeClass]=null;
  $$('.stat-selector').forEach(selector=>{
    const skill=selector.dataset.statSelector,selected=skill===selectedStats[activeClass];
    selector.hidden=!available.has(skill);
    selector.classList.toggle('selected',selected);
    selector.querySelector('[data-stat-select]').setAttribute('aria-pressed',String(selected));
    selector.querySelector('[data-stat-select]').setAttribute('aria-expanded',String(selected));
  });
  $$('[data-stat]').forEach(output=>{output.closest('.stat-row').hidden=!available.has(output.dataset.stat)||output.dataset.stat!==selectedStats[activeClass];});
}

function syncStatVisuals(skill,row) {
  const selector=$$('.stat-selector').find(item=>item.dataset.statSelector===skill);
  const unlocked=row.querySelector('[data-stat-unlocked]');
  const icon=selector.querySelector('.stat-unlock-icon');
  selector.querySelector('.stat-selector-name').textContent=row.querySelector('.stat-name').textContent;
  icon.classList.toggle('is-unlocked',unlocked.checked);
  const node=statNodes.find(node=>node.short===skill);
  icon.querySelector('img').src=unlocked.checked ? node.icon : node.icon.replace('-unlocked.png','-locked.png');
  icon.title=unlocked.checked ? 'Unlocked' : 'Locked';
  selector.querySelector('[data-stat-select]').setAttribute('aria-label',`${row.querySelector('.stat-name').textContent}, ${unlocked.checked?'unlocked':'locked'}. ${selectedStats[activeClass]===skill?'Close':'Edit'} line levels.`);
  const savedLines=saved.statLines?.[skill];
  selector.querySelector('[data-stat-cancel]').hidden=!(unlocked.checked && !unlocked.disabled && validateStatLines(savedLines).complete && savedLines.every(level=>level===0));
  selector.querySelectorAll('.stat-mini-line').forEach((line,index)=>{
    const level=savedLines?.[index];
    const known=Number.isInteger(level)&&level>=0&&level<=10;
    line.querySelector('.stat-mini-value').textContent=known ? String(level) : '';
    line.querySelector('.stat-mini-value').setAttribute('aria-label',`${['Main Stat','2nd additional stat','3rd additional stat'][index]} ${known?level:'not entered'}`);
    line.querySelectorAll('.stat-bar i').forEach((segment,i)=>segment.classList.toggle('filled',known&&i<level));
  });
  selector.querySelector('.stat-selector-summary').classList.toggle('fd-gain',!!row.querySelector('.stat-fd').textContent);
  const summary=selector.querySelector('.stat-selector-summary');
  const fd=row.querySelector('.stat-fd').textContent;
  summary.innerHTML=fd ? fdExplanation(fd, STAT_FD_NOTE, `${row.querySelector('.stat-name').textContent} average final damage. ${STAT_FD_NOTE}`) : escapeHtml(row.querySelector('[data-stat]').textContent);
  summary.setAttribute('aria-label',`${row.querySelector('[data-stat]').getAttribute('aria-label')}. ${fd}`);
  summary.title=fd ? STAT_FD_NOTE : '';
  row.querySelectorAll('[data-stat-line]').forEach(field=>{
    const level=field.value === '' ? null : Number(field.value);
    const valid=Number.isInteger(level)&&level>=0&&level<=10;
    field.closest('.stat-line').querySelectorAll('.stat-bar i').forEach((segment,index)=>segment.classList.toggle('filled',valid&&index<level));
  });
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

function materials(cost, days, shortfall = false) {
  return `<div class="materials">${materialAmount(cost.erda, 'erda')} ${materialAmount(cost.frags, 'frags', cost.rng, shortfall)}${days === null || cost.rng ? '' : ` <span class="material-days">/ ${days}</span>`}</div>`;
}

const materialIcons = {
  erda: { path: 'assets/sol-erda.png', name: 'Sol Erda' },
  frags: { path: 'assets/sol-erda-fragment.png', name: 'Fragments' }
};
function materialAmount(value, type, rng = false, shortfall = false) {
  const { path, name } = materialIcons[type];
  const amount = rng ? (value ? `${value.toLocaleString()}+` : 'RNG') : value.toLocaleString();
  return `<span class="material-amount" aria-label="${rng ? (value ? `at least ${value.toLocaleString()}` : 'variable') : value.toLocaleString()} ${name}${shortfall ? ' needed' : ''}"><img src="${path}" alt=""><span aria-hidden="true">${amount}</span><span class="material-fallback" aria-hidden="true">${name}</span></span>`;
}
function checkMaterialIcons() {
  $$('.material-amount img, .material-heading img').forEach(img => {
    img.addEventListener('error', () => { img.parentElement.classList.add('icon-failed'); });
    if (img.complete && !img.naturalWidth) img.parentElement.classList.add('icon-failed');
  });
}


function typeClass(skill) {
  if (skill.startsWith('HEXA Stat')) return 'stat';
  const type = nodeByShort[skill]?.type || '';
  if (type.startsWith('Skill')) return 'skill';
  if (type === 'V') return 'v';
  if (type.startsWith('Common')) return 'common';
  return 'mastery';
}

function highlightCurrentSkill(skill) {
  $$('[data-node-row]').forEach(row => {
    const active = row.dataset.nodeRow === skill;
    row.classList.toggle('next-skill', active);
    if (active) row.setAttribute('aria-current', 'step');
    else row.removeAttribute('aria-current');
  });
  $$('.stat-row').forEach(row => {
    const active = row.querySelector('[data-stat]')?.dataset.stat === skill;
    row.classList.toggle('next-skill', active);
    if (active) row.setAttribute('aria-current', 'step');
    else row.removeAttribute('aria-current');
  });
}

function upgradeAction(skill, target, label, nextLevel = false) {
  return `<button type="button" data-upgrade-skill="${skill}" data-upgrade-level="${target}" ${nextLevel ? 'data-next-level="true"' : ''} aria-label="${label} for ${skill}, to level ${target}">${label}</button>`;
}

function statAction(skill, action, label) {
  return `<button type="button" data-upgrade-skill="${skill}" data-stat-action="${action}" aria-label="${label} for ${skill}">${label}</button>`;
}

const STAT_FD_NOTE='General average from the Inven-supplied HEXA Stat table, not personalised FD. Shown only with valid line levels totalling 20.';
function fdExplanation(text,note,label) {
  return `<button type="button" class="fd-gain fd-info" data-fd-note="${escapeHtml(note)}" title="${escapeHtml(note)}" aria-label="${escapeHtml(label)} Open FD explanation." aria-haspopup="dialog" aria-controls="fd-explanation">${escapeHtml(text)}</button>`;
}
function fdText(result) {
  const note = result.estimated
    ? 'Approximate FD gain. The remaining gain within a partly completed Scouter step is estimated from its share of Fragment cost. Actual gain may differ.'
    : 'Approximate FD gain based on rounded Maple Scouter step values. Combined gains are compounded.';
  return fdExplanation(`${result.estimated ? '≈' : ''}+${result.gain.toFixed(3)}% FD`,note,`${result.estimated ? 'Estimated ' : ''}plus ${result.gain.toFixed(3)} percent final damage. ${note}`);
}
const fdDialog=$('#fd-explanation');
let fdOpener=null;
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-fd-note]');
  if(!button)return;
  fdOpener=button;
  $('#fd-explanation-text').textContent=button.dataset.fdNote;
  fdDialog.showModal();
});
$('#fd-explanation-close').addEventListener('click',()=>fdDialog.close());
fdDialog.addEventListener('close',()=>{
  if(fdOpener?.isConnected)fdOpener.focus();
  fdOpener=null;
});

function upgradeCost(label, cost, time, action = '', owned = null) {
  const shortfall = owned !== null && !cost.rng;
  const displayCost = shortfall ? {...cost, frags:fragmentShortfall(cost.frags, owned)} : cost;
  return `<div class="upgrade-cost"><div class="upgrade-cost-details"><span>${label}</span>${materials(displayCost, time, shortfall)}</div>${action}</div>`;
}

function render(allowConflict=false) {
  checkActive();
  syncView();
  // A failed refresh keeps the verified DOM and saved state read-only.
  // View/visibility preferences can still change without writing progress.
  if((playerStorage.conflict(storageKey) && !allowConflict) || (sourcePaused() && verifiedClass===activeClass)) {
    if(view==='infographic' && infographicScope)infographic.render(infographicDisplayCheckpoints(infographicEntries,saved,infographicScope),saved,infographicScope,$('#infographic-hide').checked);
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
    $('#infographic-context').textContent='';
    $('#infographic-message').textContent=classLoading?'Loading...':classLoadFailed?'Priorities could not be loaded.':'No saved priority is available for this selection.';
    checkMaterialIcons();
    return;
  }
  const sourceMode = previewDrafts[mode]?.sourceMode || mode;
  const priorityName = skill => {
    const tag=nodeByShort[skill]?.tag || statNodes.find(node=>node.short===skill)?.tag || '';
    return `${tag ? `<span class="skill-tag">${escapeHtml(tag)}</span> ` : ''}${escapeHtml(previewDrafts[mode]?.shortNames?.[skill] || nodeByShort[skill]?.shortName || statNodes.find(node=>node.short===skill)?.shortName || skill)}`;
  };
  const captured = previewDrafts[mode]?.capturedCosts;
  if (!captured) {
    $('#next-upgrade').innerHTML = '<div class="metric"><strong>Captured level costs unavailable</strong><p>Grab Scouter info and save a new priority pair in the Admin Panel.</p></div>';
    $('#priority').replaceChildren(); $('#totals').replaceChildren(); $('#completion').replaceChildren();
    $('#time-estimate').hidden = true; highlightCurrentSkill(null);
    infographic.clear();$('#infographic-message').textContent='Captured level costs unavailable. Grab Scouter info and save a new priority pair in the Admin Panel.';
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
  const nextIsStat = next?.skill.startsWith('HEXA Stat');
  const nextLevel = next && !nextIsStat ? Math.min((current[next.skill] || 0) + 1, next.level) : null;
  const levelCost = next && !nextIsStat && rangeCost(next.skill, current[next.skill] || 0, nextLevel);
  const nextRowGain = nextRow && !nextIsStat ? combinedSourceGain(order, nextRow, current[nextRow.skill] || 0) : null;
  $('#version-name').textContent = `${catalog.settings[mode].selectionName} / ${catalog.settings[mode].world === 'heroic' ? 'Fragments (Heroic)' : 'Sol Erda (Interactive)'}`;
  $('#progress').textContent = steps.length ? `${completed} / ${steps.length} complete` : 'Maple Scouter order pending';
  $('#next-upgrade').style.setProperty('--skill-accent', skillAccent(nextRow?.skill));
  const nextIcon = nextRow && (statNodes.find(node=>node.short===nextRow.skill)?.icon || previewDrafts[mode]?.statIcons[nextRow.skill] || nodeByShort[nextRow.skill]?.icon);
  const statStep = nextIsStat && (statUnlocked[next.skill]
    ? upgradeCost(`Completion · ${nextRow.level}`, nextRow.cost, null, statAction(next.skill, 'lines', 'Enter line levels'))
    : upgradeCost('Unlock', { ...nextRow.cost, rng: false }, duration({...nextRow.cost, rng:false}), statAction(next.skill, 'unlock', 'Mark unlocked'), inventory));
  $('#next-upgrade').innerHTML = `${next && nextRow ? `<div class="metric" style="--skill-accent:${skillAccent(nextRow.skill)}"><div class="upgrade-top"><small>Next Upgrade</small></div><div class="upgrade-heading"><div class="upgrade-label"><span class="node-icon" aria-hidden="true"><span>${nextRow.skill[0]}</span>${nextIcon ? `<img src="${nextIcon}" alt="">` : ''}</span><strong>${priorityName(nextRow.skill)} → ${nextRow.level}</strong></div>${nextRowGain === null ? '' : fdText(nextRowGain)}</div>${nextIsStat ? statStep : `${upgradeCost(`Level ${current[next.skill] || 0} → ${nextLevel}`, levelCost, duration(levelCost), upgradeAction(next.skill, nextLevel, 'Add 1 Level', true), inventory)}${nextRow.level === nextLevel ? '' : upgradeCost(`Level ${current[next.skill] || 0} → ${nextRow.level} · Checkpoint`, nextRow.cost, duration(nextRow.cost), upgradeAction(next.skill, nextRow.level, 'Add to checkpoint'), inventory)}`}</div>` : `<div class="metric"><strong>${steps.length ? 'Priority complete' : 'Maple Scouter order pending'}</strong></div>`}`;
  $$('#next-upgrade .upgrade-heading img').forEach(img => {
    img.addEventListener('error', () => { img.hidden = true; });
    if (img.complete && !img.naturalWidth) img.hidden = true;
  });
  let remainingIndex = 0;
  $('#priority').innerHTML = displayRows.map((row, rowIndex) => {
    const cost = row.cost;
    const number = value => value === 0 ? '<span class="zero">0</span>' : value.toLocaleString();
    if (!row.done) remainingIndex++;
    const displayIndex = $('#hideDone').checked && !row.done ? remainingIndex : rowIndex + 1;
    const icon = statNodes.find(node=>node.short===row.skill)?.icon || previewDrafts[mode]?.statIcons[row.skill] || nodeByShort[row.skill]?.icon;
    const isNext = row.index <= index + 1 && index + 1 <= row.endIndex;
    const gain = row.done || row.skill.startsWith('HEXA Stat') ? null : combinedSourceGain(order, row, current[row.skill] || 0);
    const fd = gain === null ? '' : fdText(gain);
    return `<tr class="type-${typeClass(row.skill)} ${row.done ? 'done' : ''} ${isNext ? 'next' : ''}" ${isNext ? 'aria-current="step"' : ''} style="--skill-accent:${skillAccent(row.skill)}"><td>${displayIndex}</td><td><span class="skill-cell">${icon ? `<img class="stat-icon" src="${icon}" alt="">` : '<i class="dot" aria-hidden="true"></i>'}<span>${priorityName(row.skill)}</span></td><td>${row.level}</td><td>${number(cost.erda)}</td><td>${cost.rng ? `<span class="rng" aria-label="${cost.frags ? `at least ${cost.frags} Fragments` : 'variable Fragment cost'}">${cost.frags ? `${cost.frags.toLocaleString()}+` : 'RNG'}</span>` : number(cost.frags)}</td><td>${fd}</td></tr>`;
  }).join('');
  $('#completion').innerHTML = `<div class="completion-label"><span>HEXA Matrix Completion</span><strong>${matrix.percent.toFixed(2)}%</strong></div><div class="completion-track" role="progressbar" aria-label="HEXA Matrix completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${matrix.percent.toFixed(2)}"><span style="width:${matrix.percent.toFixed(2)}%"></span></div>`;
  $$('.stat-icon').forEach(img => { img.addEventListener('error', () => { img.hidden = true; }); });
  $('.priority-table').classList.toggle('hide-done', $('#hideDone').checked);
  $('#totals').innerHTML = `<div class="total"><small>Total Materials Spent</small><strong class="material-total">${materialAmount(matrix.spent.erda, 'erda')} ${materialAmount(matrix.spent.frags, 'frags')}</strong></div><div class="total" id="total-remaining" ${matrix.percent >= 100 ? 'hidden' : ''}><small>Materials to Complete HEXA Matrix</small><strong class="material-total">${materialAmount(matrix.remaining.erda, 'erda')} ${materialAmount(matrix.remaining.frags, 'frags')}</strong></div>`;
  checkMaterialIcons();
  $('#time-estimate').hidden = !heroic || !rate;
  if (heroic && rate) {
    const finish = fragmentCompletionDate(days(matrix.remaining));
    $('#time-estimate').innerHTML = `<small>Estimated time for remaining Fragments</small><strong>${finish ? `${finish} · ` : ''}${duration(matrix.remaining)}</strong>`;
  }
  $$('[data-stat]').forEach(input => {
    const row=input.closest('.stat-row');
    const name = row.querySelector('.stat-name');
    if (name) name.textContent = previewDrafts[mode]?.names[input.dataset.stat] || input.dataset.stat;
    const progress=statProgress(saved.statLines?.[input.dataset.stat], current[input.dataset.stat], saved.statCompleted?.[input.dataset.stat] === true);
    input.textContent=progress.total < 20 ? `${progress.total} / 20` : '';
    input.setAttribute('aria-label', `${progress.total} of 20 levels`);
    row.querySelector('.stat-fd').textContent=progress.fd === null || row.querySelector('[aria-invalid="true"]') ? '' : `~${progress.fd.toFixed(3)}% FD`;
    if (!row.querySelector('[aria-invalid="true"]')) row.querySelector('.stat-note').textContent=progress.hasLines && (!saved.statCompleted?.[input.dataset.stat] || validateStatLines(saved.statLines?.[input.dataset.stat]).total === 20) ? '' : `Saved total ${progress.total} / 20. Enter all three line levels to update it.`;
    syncStatVisuals(input.dataset.stat, row);
  });
  $$('[data-node-row]').forEach(row => {
    row.querySelector('.node-name').textContent = previewDrafts[mode]?.names[row.dataset.nodeRow] || nodeByShort[row.dataset.nodeRow].name;
    const label = row.querySelector('.node-label');
    let tag = label.querySelector('.skill-tag');
    const tagText = nodeByShort[row.dataset.nodeRow]?.tag || '';
    if (tagText && !tag) { tag = document.createElement('span'); tag.className = 'skill-tag'; label.prepend(tag); }
    if (tag) { tag.textContent = tagText; tag.hidden = !tagText; }
  });
  if(!playerStorage.conflict(storageKey)) {
  saved = { statCompleted:saved.statCompleted || {}, infographicUndo:saved.infographicUndo || {}, mode, levels: current, statUnlocked: {...saved.statUnlocked,...statUnlocked}, statLines: saved.statLines || {}, owned, perday, erdaRequest, epicDungeon, hideDone: $('#hideDone').checked, includeJanus };
  reconcileInfographicUndo(saved,infographicScope,infographicEntries);
  }
  $('#infographic-context').textContent=`${$('#class').selectedOptions[0]?.textContent || activeClass} / ${$('#version-name').textContent}`;
  $('#infographic-message').textContent=infographicEntries.length ? '' : 'No checkpoints are available for this priority.';
  if(view==='infographic')infographic.render(infographicDisplayCheckpoints(infographicEntries,saved,infographicScope),saved,infographicScope,$('#infographic-hide').checked);
  if(!playerStorage.conflict(storageKey))playerStorage.write(storageKey,saved);
  syncPausedControls();
}

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
document.addEventListener('input', event=>{
  if(editsPaused())return;
  if(event.target.matches('[data-stat-line]')) {updateStatLine(event.target);return;}
  if(event.target.matches('[data-node]')) {
    const edit=beginProgressEdit(event.target,event.target.dataset.node);
    if(validLevel(event.target)!==saved.levels?.[edit.skill])invalidateInfographicUndo(saved,edit.skill);
    render();finishProgressEdit(edit);return;
  }
  if(!['class','music-volume'].includes(event.target.id))render();
});
document.addEventListener('change', event => {
  if(editsPaused()){if(event.target.id==='infographic-hide')render();return;}
  if(['class','music-volume'].includes(event.target.id))return;
  if(event.target.matches('[data-stat-line]')) {
    updateStatLine(event.target);pendingProgressEdit=null;return;
  }
  if(event.target.matches('[data-node], [data-stat-unlocked]')) {
    const edit=beginProgressEdit(event.target,event.target.dataset.node || event.target.dataset.statUnlocked);
    const changed=event.target.matches('[data-node]') ? validLevel(event.target)!==saved.levels?.[edit.skill] : event.target.checked!==saved.statUnlocked?.[edit.skill];
    if(changed)invalidateInfographicUndo(saved,edit.skill);
    if(event.target.matches('[data-node]'))event.target.value=validLevel(event.target);
    render();finishProgressEdit(edit,true);return;
  }
  render();
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

function downloadJSON(value,name) {
  const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
}
async function backupModels() {
  const entries=await Promise.all(Object.keys(PLAYER_CLASSES).map(async className=>[className,(await classLoader.request(className)).model]));
  return Object.fromEntries(entries);
}
async function currentBackup(models) {
  await playerStorage.flush();
  const classes={};
  for(const className of Object.keys(PLAYER_CLASSES)) {
    const key='hexa-tracker-'+className+'-v1';
    if(!playerStorage.canBackup(key))throw new Error('Saved progress for '+PLAYER_CLASS_NAMES[className]+' needs recovery before export');
    classes[className]=playerStorage.read(key);
  }
  return createPlayerBackup(classes,models);
}
function backupStatus(message,error=false) {
  const status=$('#backup-status');status.hidden=!message;status.textContent=message;status.classList.toggle('error',error);
}
$('#export-progress').addEventListener('click',async()=>{
  const button=$('#export-progress');button.disabled=true;backupStatus('Preparing progress backup...');
  try {
    const backup=await currentBackup(await backupModels());
    downloadJSON(backup,'hexa-matrix-progress-'+new Date().toISOString().slice(0,10)+'.json');
    backupStatus('Progress backup exported for all classes.');
  } catch(error) {backupStatus('Progress could not be exported: '+error.message,true);}
  finally {button.disabled=false;}
});
$('#import-progress').addEventListener('click',()=>{if(!editsPaused())$('#import-progress-file').click();});
$('#import-progress-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file || editsPaused())return;
  const importSequence=refreshSequence;
  backupStatus('Checking progress backup...');
  try {
    if(file.size>500000)throw new Error('Backup file is too large');
    const models=await backupModels();
    let value;try{value=JSON.parse(await file.text());}catch{throw new Error('Backup is not valid JSON');}
    const classes=parsePlayerBackup(value,models),names=Object.keys(classes).map(name=>PLAYER_CLASS_NAMES[name]).join(', ');
    if(!confirm(`Restore progress for ${names}? Existing progress for these classes will be replaced. A safety backup of your current progress will download first.`)){backupStatus('Import cancelled.');return;}
    await currentBackup(models);
    if(editsPaused() || importSequence!==refreshSequence)throw new Error('Tracker data changed during import. Retry after loading succeeds');
    const replacements=Object.fromEntries(Object.entries(classes).map(([className,progress])=>['hexa-tracker-'+className+'-v1',progress]));
    saveActionPending=true;syncConflict();
    const replaced=await playerStorage.replaceMany(replacements,()=>{
      if(sourcePaused() || playerStorage.conflict(storageKey) || importSequence!==refreshSequence)return false;
      // The safety download and replacement share the same cross-tab lock.
      const current=Object.fromEntries(Object.keys(PLAYER_CLASSES).map(name=>[name,playerStorage.session('hexa-tracker-'+name+'-v1')]));
      downloadJSON(createPlayerBackup(current,models),'hexa-matrix-before-import-'+new Date().toISOString().slice(0,10)+'.json');
      return true;
    },Object.keys(PLAYER_CLASSES).map(name=>'hexa-tracker-'+name+'-v1'));
    saveActionPending=false;syncConflict();
    if(!replaced)throw new Error('Save changed or storage failed during import. Keep this tab open and retain any safety backup');
    clearProgressUndo();
    saved=playerStorage.read(storageKey);
    selectedStats[activeClass]=null;renderInputs();render();
    backupStatus(`Imported ${names}. Infographic undo history was cleared as agreed.`);
  } catch(error) {saveActionPending=false;syncConflict();backupStatus('Progress import failed: '+error.message,true);}
});
$('#continue-tab-save').addEventListener('click',async()=>{
  if(sourcePaused() || saveActionPending || !playerStorage.conflict(storageKey))return;
  const key=storageKey,className=activeClass,progress=structuredClone(saved);
  saveActionPending=true;syncConflict();
  const continued=await playerStorage.continueSave(key,progress,()=>{
    if(key!==storageKey || sourcePaused())return false;
    return confirm(`Continue this ${PLAYER_CLASS_NAMES[className]} save? This replaces the newer saved progress for this class with the progress in this tab.`);
  });
  saveActionPending=false;syncConflict();
  if(key!==storageKey)return;
  if(!continued){backupStatus('This save was not continued. Replacement was cancelled, or the newer save could not be read or written. Both copies were kept.',true);return;}
  // Keep this tab's fields, including invalid drafts, and its matching Undo.
  // Only valid saved progress is written. The other tab will detect this write.
  render();backupStatus(`Continuing this tab's ${PLAYER_CLASS_NAMES[className]} save.`);
});
$('#load-latest-save').addEventListener('click',async()=>{
  if(sourcePaused() || saveActionPending)return;
  const key=storageKey,className=activeClass;
  saveActionPending=true;syncConflict();
  const adopted=await playerStorage.adopt(key,latest=>{
    if(key!==storageKey || sourcePaused())return false;
    const drafts=$$('[data-node], [data-stat-line]').some(input=>input.validity.badInput || !input.validity.valid ||
      (input.dataset.statLine && String(input.value)!==String(saved.statLines?.[input.dataset.statLine]?.[Number(input.dataset.lineIndex)] ?? '')));
    return (JSON.stringify(latest)===JSON.stringify(saved) && !drafts) ||
      confirm(`Load the latest saved ${PLAYER_CLASS_NAMES[className]} progress? This replaces this tab's progress and unfinished inputs.`);
  });
  saveActionPending=false;syncConflict();
  if(key!==storageKey)return;
  if(!adopted){backupStatus('Latest save was not loaded. It may be unreadable or damaged, or loading was cancelled. This tab and the saved record were kept.',true);syncConflict();return;}
  saved=playerStorage.read(key);clearProgressUndo();selectedStats[activeClass]=null;
  renderInputs();render();syncConflict();backupStatus(`Loaded latest saved ${PLAYER_CLASS_NAMES[className]} progress.`);
});
async function refreshSharedPriorities({force=false}={}) {
  checkActive();
  if(playerStorage.conflict(storageKey) && verifiedClass===activeClass){syncConflict();return;}
  const hadView=verifiedClass===activeClass;
  const classAtStart=activeClass,sequence=++refreshSequence;
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
    NODES=model.nodes;statNodes=model.stats;nodeByShort=Object.fromEntries(NODES.map(node=>[node.short,node]));setTrackerCatalogue(NODES);
    previewDrafts=drafts;catalog=previewCatalog(drafts);
    if (initialSharedLoad && requestedMode && catalog.settings[requestedMode]?.enabled && catalog.priorities[requestedMode]?.length) saved.mode = requestedMode;
    initialSharedLoad = false;
    if (catalog.settings[saved.mode]) $('#patch').value = catalog.settings[saved.mode].selectionId;
    if(!playerStorage.conflict(storageKey) || !hadView)renderInputs();
    render(!hadView);syncConflict();$('#priority-sync').textContent = '';
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
  }
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
window.addEventListener('focus',()=>{checkActive();refreshSharedPriorities({force:true});});
$('#reset').onclick = async () => {
  if(editsPaused())return;
  if (confirm(`Reset saved ${activeClass==='ren'?'Ren':'Hoyoung'} levels and resources?`)) {
    clearProgressUndo();
    const resetKey=storageKey;
    saveActionPending=true;syncConflict();
    await playerStorage.remove(resetKey);
    saveActionPending=false;syncConflict();
    if(resetKey!==storageKey || playerStorage.conflict(resetKey))return;
    saved = playerStorage.session(resetKey);
    renderInputs();
    render();
  }
};
appReady=true;
renderInputs();
render();syncConflict();

refreshSharedPriorities();
