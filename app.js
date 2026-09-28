import { NODES } from './data.js';
import { activeNodes, matrixTotals, nextCheckpoint, rangeCost } from './planner.js';

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
  $('#nodes').innerHTML = NODES.map(node => `<label class="node" data-node-row="${node.short}"><img src="${node.icon}" alt=""><span><b>${node.name}</b><small>${node.type}</small></span><input data-node="${node.short}" aria-label="${node.name} level" type="number" min="0" max="30" value="${saved.levels?.[node.short] ?? 0}"></label>`).join('');
  $$('[data-stat]').forEach(input => { input.value = saved.levels?.[input.dataset.stat] ?? 0; });
  const oldMode = { heroic: 'hecate_heroic', interactive: 'hecate_interactive' };
  $('#mode').value = oldMode[saved.mode] || saved.mode || 'lotus_heroic';
  $('#owned').value = saved.owned ?? 0;
  $('#perday').value = saved.perday ?? 0;
  $('#hideDone').checked = saved.hideDone !== false;
}

function levels() {
  const result = { ...saved.levels };
  $$('[data-node]').forEach(input => { result[input.dataset.node] = clamp(input.value, 30); });
  $$('[data-stat]').forEach(input => { result[input.dataset.stat] = clamp(input.value, 20); });
  return result;
}

function materials(cost, days) {
  return `<div class="materials">${cost.erda.toLocaleString()} Sol Erda · ${cost.frags.toLocaleString()} Fragments${days === null ? '' : ` · ${days.toFixed(1)} days`}</div>`;
}

function render() {
  const mode = $('#mode').value;
  const current = levels();
  const { steps, index, next } = nextCheckpoint(current, mode);
  const owned = clamp($('#owned').value, 9999999);
  const perday = clamp($('#perday').value, 9999999);
  const days = cost => perday ? Math.max(0, cost.frags - owned) / perday : null;
  const matrix = matrixTotals(current, mode);
  const note = '<div class="materials">RNG upgrade, materials not estimated</div>';
  const checkpointCost = next && rangeCost(next.skill, current[next.skill] || 0, next.level);
  const nextLevel = next && Math.min((current[next.skill] || 0) + 1, next.level);
  const levelCost = next && rangeCost(next.skill, current[next.skill] || 0, nextLevel);
  $('#quick').innerHTML = `${next ? `<div class="metric"><small>Next checkpoint</small><strong>${next.skill} → ${next.level}</strong>${checkpointCost ? materials(checkpointCost, days(checkpointCost)) : note}</div><div class="metric"><small>Next individual level</small><strong>${next.skill} → ${nextLevel}</strong>${levelCost ? materials(levelCost, days(levelCost)) : note}</div>` : '<div class="metric"><strong>Priority complete</strong></div>'}<div class="metric"><small>Selected skill node completion</small><strong>${matrix.percent.toFixed(2)}%</strong>${materials(matrix.remaining, days(matrix.remaining))}</div><div class="metric"><small>Materials spent on selected nodes</small><strong>${matrix.spent.erda.toLocaleString()} Sol Erda · ${matrix.spent.frags.toLocaleString()} Fragments</strong></div><div class="metric"><small>Priority progress</small><strong>${index} / ${steps.length} checkpoints complete</strong></div>`;
  $('#priority').innerHTML = steps.map((step, i) => `<div class="step ${i < index ? 'done' : ''} ${i === index ? 'next' : ''}"><span class="num">${i + 1}</span><span>${step.skill}</span><span class="target">Lv. ${step.level}</span></div>`).join('');
  $('#priority').classList.toggle('hide-done', $('#hideDone').checked);
  const available = new Set(activeNodes(mode).map(node => node.short));
  $$('[data-node-row]').forEach(row => { row.hidden = !available.has(row.dataset.nodeRow); });
  saved = { mode, levels: current, owned, perday, hideDone: $('#hideDone').checked };
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
