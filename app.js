import { NODES } from './data.js';
import { activeNodes, matrixTotals, nextCheckpoint, priorityRows, rangeCost, taotieCatchUp } from './planner.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const storageKey = 'hexa-tracker-hoyoung-v1';
let saved;
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; }
catch { saved = {}; }

function clamp(value, max) {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}

function renderInputs() {
  $('#nodes').innerHTML = NODES.map(node => `<label class="node-row" data-node-row="${node.short}" title="${node.name}"><img src="${node.icon}" alt=""><span class="node-name">${node.name}</span><input data-node="${node.short}" aria-label="${node.name} level" type="number" min="0" max="30" value="${saved.levels?.[node.short] ?? 0}"></label>`).join('');
  $$('[data-stat]').forEach(input => { input.value = saved.levels?.[input.dataset.stat] ?? 0; });
  const region = saved.mode?.startsWith('taotie_') ? 'taotie' : 'lotus';
  $('#mode').value = `${region}_${saved.mode?.endsWith('interactive') ? 'interactive' : 'heroic'}`;
  $('#owned').value = saved.owned ?? 0;
  $('#perday').value = saved.perday ?? 0;
  $('#hideDone').checked = saved.hideDone !== false;
  $('#includeJanus').checked = saved.includeJanus === true;
}

function levels() {
  const result = { ...saved.levels };
  $$('[data-node]').forEach(input => { result[input.dataset.node] = clamp(input.value, 30); });
  $$('[data-stat]').forEach(input => { result[input.dataset.stat] = clamp(input.value, 20); });
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
  const mode = $('#mode').value;
  const current = levels();
  const { steps, index, completed, next } = nextCheckpoint(current, mode);
  const owned = clamp($('#owned').value, 9999999);
  const perday = clamp($('#perday').value, 9999999);
  const days = cost => perday ? Math.max(0, cost.frags - owned) / perday : null;
  const includeJanus = $('#includeJanus').checked;
  const matrix = matrixTotals(current, mode, includeJanus);
  const catchUp = taotieCatchUp(current, mode);
  const note = '<div class="materials">RNG / no fixed material cost</div>';
  const checkpointCost = next && rangeCost(next.skill, current[next.skill] || 0, next.level);
  const nextLevel = next && Math.min((current[next.skill] || 0) + 1, next.level);
  const levelCost = next && rangeCost(next.skill, current[next.skill] || 0, nextLevel);
  $('#source-note').textContent = mode.startsWith('taotie_') ? 'Future GMS planning / KMS priority snapshot' : 'Current GMS / Lotus priority snapshot';
  $('#version-name').textContent = mode.startsWith('taotie_') ? 'KMS / Taotie preview' : 'GMS / Lotus';
  $('#progress').textContent = `${completed} / ${steps.length} complete`;
  $('#quick').innerHTML = `${next ? `<div class="metric"><small>Checkpoint</small><strong>${next.skill} → ${next.level}</strong>${checkpointCost ? materials(checkpointCost, days(checkpointCost)) : note}</div><div class="metric"><small>Next level</small><strong>${next.skill} → ${nextLevel}</strong>${levelCost ? materials(levelCost, days(levelCost)) : note}</div>` : '<div class="metric"><strong>Priority complete</strong></div>'}`;
  if (catchUp) $('#quick').insertAdjacentHTML('afterbegin', `<div class="metric catch-up"><small>Taotie catch-up</small><strong>Taotie → ${catchUp.target}</strong>${materials(catchUp.cost, days(catchUp.cost))}<small class="explain">Through your completed existing-node checkpoints.</small></div>`);
  let remainingIndex = 0;
  $('#priority').innerHTML = priorityRows(current, mode).map(row => {
    const cost = row.cost;
    const number = value => value === 0 ? '<span class="zero">0</span>' : value.toLocaleString();
    if (!row.done) remainingIndex++;
    const displayIndex = $('#hideDone').checked && !row.done ? remainingIndex : row.index;
    return `<tr class="type-${typeClass(row.skill)} ${row.done ? 'done' : ''} ${row.index === index + 1 ? 'next' : ''}"><td>${displayIndex}</td><td><span class="skill-cell"><i class="dot" aria-hidden="true"></i>${row.skill}</span></td><td>${row.level}</td><td>${cost ? number(cost.erda) : '<span class="rng">RNG</span>'}</td><td>${cost ? number(cost.frags) : '<span class="rng">RNG</span>'}</td></tr>`;
  }).join('');
  $('.priority-table').classList.toggle('hide-done', $('#hideDone').checked);
  $('#totals').innerHTML = `<div class="total"><small>HEXA skill node completion</small><strong>${matrix.percent.toFixed(2)}%</strong>${materials(matrix.remaining, days(matrix.remaining))}</div><div class="total"><small>Total materials spent</small><strong>${matrix.spent.erda.toLocaleString()} Sol Erda / ${matrix.spent.frags.toLocaleString()} Fragments</strong></div>`;
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
