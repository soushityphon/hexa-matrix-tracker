import { NODES, PRIORITIES, PRIORITY_LABELS, PRIORITY_SETTINGS, STAT_ICONS } from './data.js';
import { activeNodes, matrixTotals, nextCheckpoint, priorityRows, priorityPatch, rangeCost, taotieCatchUp } from './planner.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const storageKey = 'hexa-tracker-hoyoung-v1';
let saved;
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; }
catch { saved = {}; }

function clamp(value, max) {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}

function syncPriorityOptions() {
  const select = $('#patch');
  const world = $('[name="world"]:checked').value;
  const updates = [...new Set(Object.keys(PRIORITIES).filter(mode => PRIORITIES[mode].length && PRIORITY_SETTINGS[mode]?.enabled).map(mode => PRIORITY_SETTINGS[mode].patch))];
  const labels = { lotus: 'GMS Lotus', taotie: 'KMS Taotie' };
  const previousPatch = select.value;
  if (updates.join('|') !== [...select.options].map(option => option.value).join('|')) select.replaceChildren(...updates.map(patch => new Option(labels[patch] || patch, patch)));
  const patch = previousPatch || PRIORITY_SETTINGS[saved.mode]?.patch || updates[0];
  select.value = updates.includes(patch) ? patch : updates[0] || '';
  const modes = Object.keys(PRIORITIES).filter(mode => PRIORITIES[mode].length && PRIORITY_SETTINGS[mode]?.enabled && PRIORITY_SETTINGS[mode].world === world && PRIORITY_SETTINGS[mode].patch === select.value);
  const versions = $('#priority-version');
  const previousVersion = versions.value || saved.mode;
  versions.replaceChildren(...modes.map(mode => new Option(PRIORITY_LABELS[mode], mode)));
  $('#version-picker').hidden = modes.length < 2;
  if (modes.includes(previousVersion)) versions.value = previousVersion;
  return versions.value;
}

function renderInputs() {
  $('#nodes').innerHTML = NODES.map((node, index) => `${index === 0 || NODES[index - 1].group !== node.group ? `<div class="group-label">${node.group}</div>` : ''}<label class="node-row" data-node-row="${node.short}" title="${node.name}"><span class="node-icon"><span aria-hidden="true">${node.short[0]}</span><img src="${node.icon}" alt=""></span><span class="node-name">${node.name}</span><input data-node="${node.short}" aria-label="${node.name} level" type="number" min="0" max="30" value="${saved.levels?.[node.short] ?? 0}"></label>`).join('');
  $$('.node-icon img').forEach(img => {
    img.addEventListener('error', () => { img.hidden = true; });
    if (img.complete && !img.naturalWidth) img.hidden = true;
  });
  $$('[data-stat]').forEach(input => {
    const icon = STAT_ICONS[input.dataset.stat];
    if (!icon) return;
    const label = input.closest('label');
    if (label.querySelector('img')) return;
    const image = document.createElement('img');
    image.src = icon;
    image.alt = '';
    image.addEventListener('error', () => { image.hidden = true; });
    label.prepend(image);
  });
  $$('[data-node="Apotheosis"]').forEach(input => { input.value = Math.max(1, Number(input.value) || 0); });
  $$('[data-stat]').forEach(input => { input.value = saved.levels?.[input.dataset.stat] ?? 0; });
  $(`[name="world"][value="${PRIORITY_SETTINGS[saved.mode]?.world || 'heroic'}"]`).checked = true;
  syncPriorityOptions();
  $('#owned').value = saved.owned ?? 0;
  $('#perday').value = saved.perday ?? 0;
  $('#hideDone').checked = saved.hideDone !== false;
  $('#includeJanus').checked = saved.includeJanus === true;
}

function levels() {
  const result = { ...saved.levels };
  $$('[data-node]').forEach(input => { result[input.dataset.node] = clamp(input.value, 30); });
  $$('[data-stat]').forEach(input => { result[input.dataset.stat] = clamp(input.value, 20); });
  result.Apotheosis = Math.max(1, result.Apotheosis || 0);
  return result;
}

function materials(cost, days) {
  return `<div class="materials">${cost.erda.toLocaleString()} Sol Erda / ${cost.frags.toLocaleString()} Fragments${days === null ? '' : ` / ${days.toFixed(1)} days`}</div>`;
}

const nodeByShort = Object.fromEntries(NODES.map(node => [node.short, node]));
function typeClass(skill) {
  if (skill.startsWith('HEXA Stat')) return 'stat';
  const type = nodeByShort[skill]?.type || '';
  if (type.startsWith('Skill')) return 'skill';
  if (type === 'V') return 'v';
  if (type.startsWith('Common')) return 'common';
  return 'mastery';
}

function render() {
  const mode = syncPriorityOptions();
  if (!mode) {
    $('#version-name').textContent = `${$('#patch').selectedOptions[0]?.textContent || 'Update'} / ${$('[name="world"]:checked').value === 'heroic' ? 'Fragments' : 'Sol Erda'}`;
    $('#progress').textContent = 'No registered priority is visible for this selection';
    $('#next-upgrade').textContent = 'No priority is available for this update and world.';
    $('#priority').replaceChildren();
    $('#totals').replaceChildren();
    return;
  }
  const patch = priorityPatch(mode);
  const current = levels();
  const { steps, index, completed, next } = nextCheckpoint(current, mode);
  const owned = clamp($('#owned').value, 9999999);
  const perday = clamp($('#perday').value, 9999999);
  const days = cost => perday ? Math.max(0, cost.frags - owned) / perday : null;
  const includeJanus = $('#includeJanus').checked;
  const matrix = matrixTotals(current, mode, includeJanus);
  const catchUp = taotieCatchUp(current, mode);
  const note = '<div class="materials">RNG / no fixed material cost</div>';
  const nextLevel = next && (next.skill.startsWith('HEXA Stat') ? next.level : Math.min((current[next.skill] || 0) + 1, next.level));
  const levelCost = next && rangeCost(next.skill, current[next.skill] || 0, nextLevel);
  $('#version-name').textContent = `${patch === 'taotie' ? 'KMS Taotie' : 'GMS Lotus'} / ${PRIORITY_SETTINGS[mode].world === 'heroic' ? 'Fragments (Heroic)' : 'Sol Erda (Interactive)'}`;
  $('#progress').textContent = steps.length ? `${completed} / ${steps.length} complete` : 'Maple Scouter order pending';
  $('#next-upgrade').innerHTML = `${next ? `<div class="metric"><small>Next Upgrade</small><strong>${next.skill} → ${nextLevel}</strong>${levelCost ? materials(levelCost, days(levelCost)) : note}</div>` : `<div class="metric"><strong>${steps.length ? 'Priority complete' : 'Maple Scouter order pending'}</strong></div>`}`;
  if (catchUp) $('#next-upgrade').insertAdjacentHTML('beforeend', `<div class="metric catch-up"><small>Taotie catch-up</small><strong>Taotie → ${catchUp.target}</strong>${materials(catchUp.cost, days(catchUp.cost))}</div>`);
  let remainingIndex = 0;
  $('#priority').innerHTML = priorityRows(current, mode).map(row => {
    const cost = row.cost;
    const number = value => value === 0 ? '<span class="zero">0</span>' : value.toLocaleString();
    if (!row.done) remainingIndex++;
    const displayIndex = $('#hideDone').checked && !row.done ? remainingIndex : row.index;
    const icon = STAT_ICONS[row.skill] || nodeByShort[row.skill]?.icon;
    return `<tr class="type-${typeClass(row.skill)} ${row.done ? 'done' : ''} ${row.index === index + 1 ? 'next' : ''}"><td>${displayIndex}</td><td><span class="skill-cell">${icon ? `<img class="stat-icon" src="${icon}" alt="">` : '<i class="dot" aria-hidden="true"></i>'}${row.skill}</span></td><td>${row.level}</td><td>${cost ? number(cost.erda) : '<span class="rng">RNG</span>'}</td><td>${cost ? number(cost.frags) : '<span class="rng">RNG</span>'}</td></tr>`;
  }).join('');
  $$('.stat-icon').forEach(img => { img.addEventListener('error', () => { img.hidden = true; }); });
  $('.priority-table').classList.toggle('hide-done', $('#hideDone').checked);
  $('#totals').innerHTML = `<div class="total"><small>HEXA Matrix Completion</small><strong>${matrix.percent.toFixed(2)}%</strong>${materials(matrix.remaining, days(matrix.remaining))}${perday ? '' : '<div class="hint">Enter Fragments per day for a time estimate.</div>'}</div><div class="total"><small>Total Materials Spent</small><strong>${matrix.spent.erda.toLocaleString()} Sol Erda / ${matrix.spent.frags.toLocaleString()} Fragments</strong></div>`;
  const available = new Set(activeNodes(mode).map(node => node.short));
  $$('[data-node-row]').forEach(row => { row.hidden = !available.has(row.dataset.nodeRow); });
  saved = { mode, levels: current, owned, perday, hideDone: $('#hideDone').checked, includeJanus };
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

document.addEventListener('input', render);
document.addEventListener('change', render);
$('#reset').onclick = () => {
  if (confirm('Reset saved Hoyoung levels and resources?')) {
    localStorage.removeItem(storageKey);
    saved = {};
    renderInputs();
    render();
  }
};
renderInputs();
render();
