let NODES = [], statNodes = [];
let nodeByShort = {};
import { setTrackerCatalogue } from './planner.js';
setTrackerCatalogue([]);
import { combinedSourceGain, displayPriorityRows, matrixTotals, nextCheckpoint, rangeCost } from './planner.js';
import { fetchSharedPreview, previewCatalog } from './preview-priorities.js';
import { skillAccent } from './skill-colours.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let activeClass='hoyoung';
try {activeClass=new URL(location.href).searchParams.get('class') || localStorage.getItem('hexa-tracker-class-v1') || 'hoyoung';}catch{}
if(!['hoyoung','ren'].includes(activeClass))activeClass='hoyoung';
$('#class').value=activeClass;
document.documentElement.dataset.class=activeClass;
let storageKey='hexa-tracker-'+activeClass+'-v1';
let refreshSequence=0;
const initialLevel=node=>node.initialLevel ?? (node.short==='Apotheosis'?1:0);
let saved;
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; }
catch { saved = {}; }
let previewDrafts = {};
let catalog = previewCatalog(previewDrafts);
const requestedMode = new URL(location.href).searchParams.get('mode');
let initialSharedLoad = true;
if (requestedMode && catalog.settings[requestedMode]?.enabled && catalog.priorities[requestedMode]?.length) saved.mode = requestedMode;

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
  $('#stat-heading').hidden = !statNodes.length;
  for (const node of statNodes) {
    const row=document.createElement('div');row.className='stat-row';
    row.innerHTML=`<img src="${escapeHtml(node.icon)}" alt=""><span class="stat-name">${escapeHtml(node.name)}</span><input data-stat="${escapeHtml(node.short)}" aria-label="${escapeHtml(node.name)} level" type="number" min="0" max="20" value="0"><label class="stat-unlocked"><input data-stat-unlocked="${escapeHtml(node.short)}" aria-label="${escapeHtml(node.name)} unlocked" type="checkbox"> Unlocked</label>`;
    $('.stat-list').append(row);
  }
  const nodeRow = node => `<label class="node-row" style="--skill-accent:${skillAccent(node.short)}" data-node-row="${node.short}" data-node-id="${node.id}" title="${escapeHtml(node.name)}"><span class="node-icon"><span aria-hidden="true">${node.short[0]}</span><img src="${node.icon}" alt=""></span><span class="node-label">${node.tag ? `<span class="skill-tag">${escapeHtml(node.tag)}</span>` : ''}<span class="node-name">${escapeHtml(node.name)}</span></span><input data-node="${node.short}" aria-label="${escapeHtml(node.name)} level" type="number" min="${initialLevel(node)}" max="30" step="1" value="${clamp(saved.levels?.[node.short], 30, initialLevel(node))}"></label>`;
  const renderGroup = (group, label, descending) => {
    const category = {'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'}[group];
    const nodes = NODES.filter(node => (previewDrafts[saved.mode]?.skillCategories?.[node.short] || {'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'}[node.group]) === category);
    if (descending) nodes.reverse();
    return `<section class="node-group"><h3 class="group-label">${label}</h3>${nodes.map(nodeRow).join('')}</section>`;
  };
  $('#nodes').innerHTML = NODES.length ? `<div class="node-column">${renderGroup('Skill Nodes', 'Skill', true)}${renderGroup('Enhancement Nodes', 'Enhancement', false)}</div><div class="node-column">${renderGroup('Mastery Nodes', 'Mastery', true)}${renderGroup('Common Nodes', 'Common', false)}</div>` : '<p class="fine">No skills saved. Populate and save Skills in the Admin Panel.</p>';
  $$('.node-icon img').forEach(img => {
    img.addEventListener('error', () => { img.hidden = true; });
    if (img.complete && !img.naturalWidth) img.hidden = true;
  });
  $$('[data-stat]').forEach(input => {
    const icon = statNodes.find(node=>node.short===input.dataset.stat)?.icon;
    if (!icon) return;
    const row = input.closest('.stat-row');
    row.style.setProperty('--skill-accent', skillAccent(input.dataset.stat));
    if (row.querySelector('img')) return;
    const image = document.createElement('img');
    image.src = icon;
    image.alt = '';
    image.addEventListener('error', () => { image.hidden = true; });
    row.prepend(image);
  });
  $$('[data-stat]').forEach(input => { input.value = clamp(saved.levels?.[input.dataset.stat], 20); });
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
  $('#hideDone').checked = saved.hideDone !== false;
  $('#includeJanus').checked = saved.includeJanus === true;
}

function levels() {
  const result = { ...saved.levels };
  $$('[data-node]').forEach(input => { result[input.dataset.node] = validLevel(input); });
  $$('[data-stat]').forEach(input => { result[input.dataset.stat] = validLevel(input); });
  return result;
}

function materials(cost, days) {
  return `<div class="materials">${materialAmount(cost.erda, 'erda')} ${materialAmount(cost.frags, 'frags', cost.rng)}${days === null || cost.rng ? '' : ` <span class="material-days">/ ${days.toFixed(1)} days</span>`}</div>`;
}

const materialIcons = {
  erda: { path: 'assets/sol-erda.png', name: 'Sol Erda' },
  frags: { path: 'assets/sol-erda-fragment.png', name: 'Fragments' }
};
function materialAmount(value, type, rng = false) {
  const { path, name } = materialIcons[type];
  const amount = rng ? (value ? `${value.toLocaleString()}+` : 'RNG') : value.toLocaleString();
  return `<span class="material-amount" aria-label="${rng ? (value ? `at least ${value.toLocaleString()}` : 'variable') : value.toLocaleString()} ${name}"><img src="${path}" alt=""><span aria-hidden="true">${amount}</span><span class="material-fallback" aria-hidden="true">${name}</span></span>`;
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
  return `<button type="button" data-upgrade-skill="${skill}" data-upgrade-level="${target}" ${nextLevel ? 'data-next-level="true"' : ''} aria-label="${label} for ${skill}">${label}</button>`;
}

function statAction(skill, action, label) {
  return `<button type="button" data-upgrade-skill="${skill}" data-stat-action="${action}" aria-label="${label} for ${skill}">${label}</button>`;
}

function fdText(result) {
  const note = result.estimated
    ? 'Approximate FD gain. The remaining gain within a partly completed Scouter step is estimated from its share of Fragment cost. Actual gain may differ.'
    : 'Approximate FD gain based on rounded Maple Scouter step values. Combined gains are compounded.';
  return `<span class="fd-gain" title="${note}" aria-label="${result.estimated ? 'Estimated ' : ''}plus ${result.gain.toFixed(3)} percent final damage. ${note}">${result.estimated ? '≈' : ''}+${result.gain.toFixed(3)}% FD</span>`;
}

function upgradeCost(label, cost, time, action = '') {
  return `<div class="upgrade-cost"><div class="upgrade-cost-details"><span>${label}</span>${materials(cost, time)}</div>${action}</div>`;
}

function render() {
  const mode = syncPriorityOptions();
  const order = catalog.priorities[mode] || [];
  // A capture's catalogue can contain skills that its priority never uses.
  // Keep their inputs and progress, but scope the matrix to this exact order.
  const available = new Set(order.map(step => step.skill));
  $$('[data-node-row]').forEach(row => { row.hidden = !available.has(row.dataset.nodeRow); });
  $$('.node-group').forEach(group => { group.hidden = !group.querySelector('[data-node-row]:not([hidden])'); });
  $$('[data-stat]').forEach(input => { input.closest('.stat-row').hidden = !available.has(input.dataset.stat); });
  $('#stat-heading').hidden = !statNodes.some(node => available.has(node.short));
  $('#includeJanus').closest('.include-option').hidden = !available.has('Janus');
  setTrackerCatalogue([]);
  if (!mode) {
    highlightCurrentSkill(null);
    $('#version-name').textContent = `${$('#patch').selectedOptions[0]?.textContent || 'Update'} / ${$('[name="world"]:checked').value === 'heroic' ? 'Fragments' : 'Sol Erda'}`;
    $('#progress').textContent = 'No saved priority is visible for this selection';
    $('#next-upgrade').textContent = 'No saved priority is available for this update and world.';
    $('#priority').replaceChildren();
    $('#totals').replaceChildren();
    $('#completion').replaceChildren();
    $('#time-estimate').hidden = true;
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
    $('#time-estimate').hidden = true; highlightCurrentSkill(null); return;
  }
  setTrackerCatalogue(NODES.filter(node=>available.has(node.short) && captured[node.short]).map(node => ({...node, costs:captured[node.short].levels, initialLevel:captured[node.short].freeBaseLevel})));
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
  const days = cost => perday ? Math.max(0, cost.frags - owned) / perday : null;
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
  const nextIcon = nextRow && (previewDrafts[mode]?.statIcons[nextRow.skill] || statNodes.find(node=>node.short===nextRow.skill)?.icon || nodeByShort[nextRow.skill]?.icon);
  const statStep = nextIsStat && (statUnlocked[next.skill]
    ? upgradeCost(`Completion · ${nextRow.level}`, nextRow.cost, null, statAction(next.skill, 'complete', 'Mark complete'))
    : upgradeCost('Unlock', { ...nextRow.cost, rng: false }, null, statAction(next.skill, 'unlock', 'Mark unlocked')));
  $('#next-upgrade').innerHTML = `${next && nextRow ? `<div class="metric" style="--skill-accent:${skillAccent(nextRow.skill)}"><div class="upgrade-top"><small>Next Upgrade</small></div><div class="upgrade-heading"><div class="upgrade-label"><span class="node-icon" aria-hidden="true"><span>${nextRow.skill[0]}</span>${nextIcon ? `<img src="${nextIcon}" alt="">` : ''}</span><strong>${priorityName(nextRow.skill)} → ${nextRow.level}</strong></div>${nextRowGain === null ? '' : fdText(nextRowGain)}</div>${nextIsStat ? statStep : `${upgradeCost(`Next level · ${nextLevel}`, levelCost, days(levelCost), upgradeAction(next.skill, nextLevel, `Mark level ${nextLevel}`, true))}${nextRow.level === nextLevel ? '' : upgradeCost(`Checkpoint · ${nextRow.level}`, nextRow.cost, days(nextRow.cost), upgradeAction(next.skill, nextRow.level, `Mark checkpoint ${nextRow.level}`))}`}</div>` : `<div class="metric"><strong>${steps.length ? 'Priority complete' : 'Maple Scouter order pending'}</strong></div>`}`;
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
    const icon = previewDrafts[mode]?.statIcons[row.skill] || statNodes.find(node=>node.short===row.skill)?.icon || nodeByShort[row.skill]?.icon;
    const isNext = row.index <= index + 1 && index + 1 <= row.endIndex;
    const gain = row.done || row.skill.startsWith('HEXA Stat') ? null : combinedSourceGain(order, row, current[row.skill] || 0);
    const fd = gain === null ? '' : fdText(gain);
    return `<tr class="type-${typeClass(row.skill)} ${row.done ? 'done' : ''} ${isNext ? 'next' : ''}" ${isNext ? 'aria-current="step"' : ''} style="--skill-accent:${skillAccent(row.skill)}"><td>${displayIndex}</td><td><span class="skill-cell">${icon ? `<img class="stat-icon" src="${icon}" alt="">` : '<i class="dot" aria-hidden="true"></i>'}<span>${priorityName(row.skill)}</span></td><td>${row.level}</td><td>${number(cost.erda)}</td><td>${cost.rng ? `<span class="rng" aria-label="${cost.frags ? `at least ${cost.frags} Fragments` : 'variable Fragment cost'}">${cost.frags ? `${cost.frags.toLocaleString()}+` : 'RNG'}</span>` : number(cost.frags)}</td><td>${fd}</td></tr>`;
  }).join('');
  $('#completion').innerHTML = `<div class="completion-label"><span>HEXA Matrix Completion</span><strong>${matrix.percent.toFixed(2)}%</strong></div><div class="completion-track" role="progressbar" aria-label="HEXA Matrix completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${matrix.percent.toFixed(2)}"><span style="width:${matrix.percent.toFixed(2)}%"></span></div>`;
  $$('.stat-icon').forEach(img => { img.addEventListener('error', () => { img.hidden = true; }); });
  $('.priority-table').classList.toggle('hide-done', $('#hideDone').checked);
  $('#totals').innerHTML = `<div class="total"><small>Total Materials Spent</small><strong class="material-total">${materialAmount(matrix.spent.erda, 'erda')} ${materialAmount(matrix.spent.frags, 'frags')}</strong></div><div class="total"><small>Materials to Complete HEXA Matrix</small><strong class="material-total">${materialAmount(matrix.remaining.erda, 'erda')} ${materialAmount(matrix.remaining.frags, 'frags')}</strong></div>`;
  checkMaterialIcons();
  $('#time-estimate').hidden = !perday;
  if (perday) $('#time-estimate').innerHTML = `<small>Estimated time for remaining Fragments</small><strong>${days(matrix.remaining).toFixed(1)} days</strong>`;
  $$('[data-stat]').forEach(input => {
    const name = input.closest('.stat-row').querySelector('.stat-name');
    if (name) name.textContent = previewDrafts[mode]?.names[input.dataset.stat] || input.dataset.stat;
  });
  $$('[data-node-row]').forEach(row => {
    row.querySelector('.node-name').textContent = previewDrafts[mode]?.names[row.dataset.nodeRow] || nodeByShort[row.dataset.nodeRow].name;
    const label = row.querySelector('.node-label');
    let tag = label.querySelector('.skill-tag');
    const tagText = nodeByShort[row.dataset.nodeRow]?.tag || '';
    if (tagText && !tag) { tag = document.createElement('span'); tag.className = 'skill-tag'; label.prepend(tag); }
    if (tag) { tag.textContent = tagText; tag.hidden = !tagText; }
  });
  saved = { mode, levels: current, statUnlocked, owned, perday, hideDone: $('#hideDone').checked, includeJanus };
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

document.addEventListener('input', event=>{if(event.target.id!=='class')render();});
document.addEventListener('change', event => {
  if(event.target.id==='class')return;
  if (event.target.matches('[data-node], [data-stat]')) event.target.value = validLevel(event.target);
  render();
});
$('#next-upgrade').addEventListener('click', event => {
  const button = event.target.closest('button[data-upgrade-skill]');
  if (!button || !$('#next-upgrade').contains(button)) return;
  if (button.dataset.statAction) {
    const stat = [...$$('[data-stat]')].find(field => field.dataset.stat === button.dataset.upgradeSkill);
    const unlocked = [...$$('[data-stat-unlocked]')].find(field => field.dataset.statUnlocked === button.dataset.upgradeSkill);
    if (!stat || !unlocked) return;
    if (button.dataset.statAction === 'unlock' && !unlocked.checked && !unlocked.disabled) {
      unlocked.checked = true;
      unlocked.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (button.dataset.statAction === 'complete' && unlocked.checked) {
      stat.value = Math.min(20, Number(stat.max));
      stat.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return;
  }
  const input = [...$$('[data-node]')].find(field => field.dataset.node === button.dataset.upgradeSkill);
  if (!input) return;
  const current = validLevel(input);
  const target = button.dataset.nextLevel ? Math.min(current + 1, Number(input.max)) : clamp(button.dataset.upgradeLevel, Number(input.max), Number(input.min));
  if (target <= current) return;
  input.value = target;
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
async function refreshSharedPriorities() {
  const classAtStart=activeClass,sequence=++refreshSequence;
  const job=classAtStart==='ren'?'렌':undefined;
  try {
    const response=await fetch('/api/tracker-catalogue'+(job?'?job='+encodeURIComponent(job):''),{cache:'no-store'});
    if(!response.ok) throw new Error('Saved skills are unavailable');
    const model=await response.json();
    if(classAtStart!==activeClass||sequence!==refreshSequence)return;
    NODES=model.nodes;statNodes=model.stats;nodeByShort=Object.fromEntries(NODES.map(node=>[node.short,node]));setTrackerCatalogue(NODES);
    const shared = await fetchSharedPreview(job);
    if(classAtStart!==activeClass||sequence!==refreshSequence)return;
    const drafts=Object.fromEntries(Object.entries(shared).filter(([,draft])=>(draft.job==='렌'?'ren':'hoyoung')===classAtStart));
    previewDrafts = drafts;
    catalog = previewCatalog(drafts);
    if (initialSharedLoad && requestedMode && catalog.settings[requestedMode]?.enabled && catalog.priorities[requestedMode]?.length) saved.mode = requestedMode;
    initialSharedLoad = false;
    if (catalog.settings[saved.mode]) $('#patch').value = catalog.settings[saved.mode].selectionId;
    renderInputs();
    render();
    $('#priority-sync').textContent = '';
  } catch (error) {
    if(classAtStart!==activeClass||sequence!==refreshSequence)return;
    NODES=[];statNodes=[];nodeByShort={};setTrackerCatalogue([]);renderInputs();
    previewDrafts = {};
    catalog = previewCatalog({});
    render();
    $('#priority-sync').textContent = `Shared priorities could not be loaded: ${error.message}. Priorities are unavailable until storage responds.`;
  }
}
$('#class').addEventListener('change',()=>{
  activeClass=$('#class').value;document.documentElement.dataset.class=activeClass;storageKey='hexa-tracker-'+activeClass+'-v1';
  localStorage.setItem('hexa-tracker-class-v1',activeClass);
  try{saved=JSON.parse(localStorage.getItem(storageKey) || '{}') || {};}catch{saved={};}
  previewDrafts={};catalog=previewCatalog({});NODES=[];statNodes=[];nodeByShort={};
  setTrackerCatalogue([]);$('#patch').replaceChildren();renderInputs();render();refreshSharedPriorities();
});
window.addEventListener('focus', refreshSharedPriorities);
$('#reset').onclick = () => {
  if (confirm(`Reset saved ${activeClass==='ren'?'Ren':'Hoyoung'} levels and resources?`)) {
    localStorage.removeItem(storageKey);
    saved = {};
    renderInputs();
    render();
  }
};
renderInputs();
render();

refreshSharedPriorities();
