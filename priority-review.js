import { NODES } from './data.js';
import { compareDraft, currentDraft, parseSteps, validateDraft } from './priority-draft.js';
import { inspectScouterResponse, resolveScouterResponse } from './scouter-import.js';

const $ = selector => document.querySelector(selector);
const key = 'hexa-priority-review-v1';
let saved = {};
let inspected = null;
let importedNodes = [];
try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { saved = {}; }
$('#payload').value = localStorage.getItem(`${key}-request`) || '';

function compareResponse(response) {
  inspected = inspectScouterResponse(response);
  renderUnknown(inspected.unknown);
  importedNodes = [];
  if (!inspected.unknown.length) {
    collectUnknown();
    const changes = compareDraft(read());
    message(changes.changedSteps || changes.lengthDifference ? `New order found: ${inspected.steps.length} steps, ${changes.changedSteps} changed positions.` : `No change: ${inspected.steps.length} steps match the current order.`);
    persist();
  } else message(`${inspected.unknown.length} new skill(s) need a name and type. Enter them, then review changes.`);
}

function read() {
  return validateDraft({
    mode: $('#mode').value,
    name: $('#name').value,
    source: $('#source').value,
    names: Object.fromEntries([...document.querySelectorAll('[data-name]')].map(input => [input.dataset.name, input.value])),
    newNodes: importedNodes,
    steps: parseSteps($('#steps').value, importedNodes.map(node => node.short))
  });
}
function show(draft) {
  inspected = null;
  importedNodes = draft.newNodes || [];
  $('#unknown').hidden = true;
  $('#unknown-list').replaceChildren();
  $('#name').value = draft.name;
  $('#source').value = draft.source || '';
  $('#steps').value = draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n');
  $('#names').innerHTML = NODES.map(node => `<div class="review-name"><label for="name-${node.short}">${node.short}</label><input id="name-${node.short}" data-name="${node.short}" type="text"></div>`).join('');
  for (const input of document.querySelectorAll('[data-name]')) input.value = draft.names[input.dataset.name] || '';
  $('#status').textContent = '';
}
function collectUnknown() {
  if (!inspected) return;
  const mappings = {};
  for (const card of document.querySelectorAll('.unknown-card')) {
    mappings[card.dataset.key] = Object.fromEntries(['short', 'name', 'type'].map(field => [field, card.querySelector(`[data-field="${field}"]`).value]));
  }
  const resolved = resolveScouterResponse(inspected, mappings);
  importedNodes = resolved.newNodes;
  $('#steps').value = resolved.steps.map(step => `${step.skill}, ${step.level}`).join('\n');
}
function renderUnknown(items) {
  const list = $('#unknown-list');
  list.replaceChildren();
  $('#unknown').hidden = !items.length;
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'unknown-card';
    card.dataset.key = item.key;
    const title = document.createElement('strong'); title.textContent = item.sourceName;
    const meta = document.createElement('small'); meta.textContent = `${item.coreId} · ${item.icon}`;
    card.append(title, meta);
    for (const [field, label] of [['short', 'Short label'], ['name', 'Display name'], ['type', 'Skill type']]) {
      const wrapper = document.createElement('label'); wrapper.textContent = label;
      const input = document.createElement(field === 'type' ? 'select' : 'input'); input.dataset.field = field;
      if (field === 'type') for (const value of ['', 'Skill', 'Skill II', 'Mastery', 'V', 'Common', 'Common II']) {
        const option = document.createElement('option'); option.value = value; option.textContent = value || 'Choose a type'; input.append(option);
      }
      wrapper.append(input); card.append(wrapper);
    }
    list.append(card);
  }
}
function message(value, error = false) {
  $('#status').textContent = value;
  $('#status').classList.toggle('error', error);
}
function persist() {
  try {
    const draft = read();
    saved[draft.mode] = draft;
    localStorage.setItem(key, JSON.stringify(saved));
  } catch { /* Keep incomplete edits in the form until valid. */ }
}
$('#mode').addEventListener('change', () => show(saved[$('#mode').value] || currentDraft($('#mode').value)));
document.addEventListener('input', persist);
$('#payload').addEventListener('input', () => localStorage.setItem(`${key}-request`, $('#payload').value));
$('#retrieve').addEventListener('click', async () => {
  try {
    const mode = $('#mode').value;
    if (mode.startsWith('hecate_')) throw new Error('The current API cannot retrieve the historical Hecate patch');
    const payload = JSON.parse($('#payload').value);
    payload.sole = mode.endsWith('_interactive');
    payload.userStat.isGMS = mode.startsWith('lotus_');
    $('#retrieve').disabled = true;
    message('Checking Maple Scouter…');
    const response = await fetch('/api/hexa-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error((await response.text()).slice(0, 160) || `Request returned ${response.status}`);
    const result = await response.json();
    $('#response').value = JSON.stringify(result);
    compareResponse(result);
  } catch (error) { message(`Could not check Maple Scouter: ${error.message}. Paste the response below to compare it.`, true); }
  finally { $('#retrieve').disabled = false; }
});
$('#inspect').addEventListener('click', () => {
  try {
    compareResponse(JSON.parse($('#response').value));
  } catch (error) { message(error.message, true); }
});
$('#review').addEventListener('click', () => {
  try {
    collectUnknown();
    const draft = read();
    const changes = compareDraft(draft);
    message(`${draft.steps.length} steps. ${changes.changedNames} display names changed. ${changes.changedSteps} steps changed at their position. ${changes.lengthDifference} net steps.`);
  } catch (error) { message(error.message, true); }
});
$('#download').addEventListener('click', () => {
  try {
    collectUnknown();
    const draft = read();
    const blob = new Blob([JSON.stringify(draft, null, 2) + '\n'], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hexa-${draft.mode}-draft.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    message('Draft downloaded for review.');
  } catch (error) { message(error.message, true); }
});
show(saved[$('#mode').value] || currentDraft($('#mode').value));
