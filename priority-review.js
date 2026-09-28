import { NODES, PRIORITIES, PRIORITY_LABELS, PRIORITY_SETTINGS } from './data.js';
import { compareDraft, currentDraft, parseSteps, validateDraft } from './priority-draft.js';
import { inspectScouterResponse, resolveScouterResponse } from './scouter-import.js';

const $ = selector => document.querySelector(selector);
const key = 'hexa-priority-review-v1';
let saved = {};
let inspected = null;
let importedNodes = [];
let version = null;
try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { saved = {}; }

function sameSteps(a, b) {
  return a.length === b.length && a.every((step, index) => step.skill === b[index].skill && step.level === b[index].level);
}
function classifyOrder() {
  const sourceMode = $('#mode').value;
  const steps = parseSteps($('#steps').value, importedNodes.map(node => node.short));
  const settings = PRIORITY_SETTINGS[sourceMode];
  const match = Object.keys(PRIORITIES).find(mode => {
    const other = PRIORITY_SETTINGS[mode];
    return other.patch === settings.patch && other.world === settings.world && sameSteps(steps, PRIORITIES[mode]);
  });
  if (match) {
    version = { sourceMode: match, mode: match, isNew: false };
    $('#priority-id').value = match;
    $('#name').value = PRIORITY_LABELS[match];
    $('#enabled').checked = PRIORITY_SETTINGS[match].enabled;
    $('#version-state').textContent = `Matches ${PRIORITY_LABELS[match]}.`;
    message(`No new priority: ${steps.length} steps match ${PRIORITY_LABELS[match]}.`);
  } else {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const base = `${settings.patch}_${settings.world}_${stamp}`;
    let mode = base;
    for (let number = 2; Object.hasOwn(PRIORITIES, mode); number++) mode = `${base}_${number}`;
    version = { sourceMode, mode, isNew: true };
    $('#priority-id').value = mode;
    $('#name').value = '';
    $('#enabled').checked = false;
    $('#version-state').textContent = 'New order. Name it and choose whether to show it on the tracker.';
    message(`New priority: ${steps.length} steps. Enter its name, then download the draft.`);
  }
}
function compareResponse(response) {
  inspected = inspectScouterResponse(response);
  renderUnknown(inspected.unknown);
  importedNodes = [];
  if (!inspected.unknown.length) {
    collectUnknown();
    classifyOrder();
    inspected = null;
    persist();
  } else message(`${inspected.unknown.length} new skill(s) need a name and type. Enter them, then review changes.`);
}

function read() {
  return validateDraft({
    ...version,
    name: $('#name').value,
    enabled: $('#enabled').checked,
    source: $('#source').value,
    names: Object.fromEntries([...document.querySelectorAll('[data-name]')].map(input => [input.dataset.name, input.value])),
    newNodes: importedNodes,
    steps: parseSteps($('#steps').value, importedNodes.map(node => node.short))
  });
}
function show(draft) {
  version = { mode: draft.mode, sourceMode: draft.sourceMode || draft.mode, isNew: draft.isNew === true };
  inspected = null;
  importedNodes = draft.newNodes || [];
  $('#unknown').hidden = true;
  $('#unknown-list').replaceChildren();
  $('#name').value = draft.name;
  $('#priority-id').value = draft.mode;
  $('#enabled').checked = draft.enabled === true;
  $('#version-state').textContent = draft.isNew ? 'New order. Name it and choose whether to show it on the tracker.' : `${PRIORITIES[draft.mode].length} imported steps.`;
  $('#source').value = draft.source || '';
  $('#steps').value = draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n');
  $('#names').innerHTML = NODES.map(node => `<div class="review-name"><label for="name-${node.short}">${node.short}</label><input id="name-${node.short}" data-name="${node.short}" type="text"></div>`).join('');
  for (const input of document.querySelectorAll('[data-name]')) input.value = draft.names[input.dataset.name] || '';
  $('#status').textContent = '';
  const historical = draft.mode.startsWith('hecate_');
  $('#retrieve').disabled = !draft.mode.startsWith('lotus_');
  $('#retrieve').title = draft.mode.startsWith('lotus_') ? '' : 'The current API cannot retrieve the historical Hecate patch or the KMS Taotie preview from a GMS request';
  if (historical) message('Historical Hecate needs a pasted Maple Scouter response.');
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
    saved[draft.sourceMode] = draft;
    localStorage.setItem(key, JSON.stringify(saved));
  } catch { /* Keep incomplete edits in the form until valid. */ }
}
$('#mode').addEventListener('change', () => show(saved[$('#mode').value] || currentDraft($('#mode').value)));
document.addEventListener('input', persist);
$('#retrieve').addEventListener('click', async () => {
  try {
    const mode = $('#mode').value;
    if (!mode.startsWith('lotus_')) throw new Error('Choose a current GMS Lotus priority');
    $('#retrieve').disabled = true;
    message('Checking Maple Scouter…');
    const response = await fetch('/api/hexa-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode })
    });
    if (!response.ok) throw new Error((await response.text()).slice(0, 160) || `Request returned ${response.status}`);
    const result = await response.json();
    $('#response').value = JSON.stringify(result);
    compareResponse(result);
  } catch (error) { message(`Could not check Maple Scouter: ${error.message}`, true); }
  finally { $('#retrieve').disabled = !$('#mode').value.startsWith('lotus_'); }
});
$('#inspect').addEventListener('click', () => {
  try {
    compareResponse(JSON.parse($('#response').value));
  } catch (error) { message(error.message, true); }
});
$('#review').addEventListener('click', () => {
  try {
    collectUnknown();
    if (inspected) {
      classifyOrder();
      inspected = null;
    }
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
$('#mode').replaceChildren(...Object.keys(PRIORITIES).map(mode => new Option(PRIORITY_LABELS[mode], mode)));
$('#mode').value = 'lotus_heroic';
show(saved[$('#mode').value] || currentDraft($('#mode').value));
