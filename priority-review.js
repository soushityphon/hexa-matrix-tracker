import { NODES } from './data.js';
import { compareDraft, currentDraft, parseSteps, validateDraft } from './priority-draft.js';

const $ = selector => document.querySelector(selector);
const key = 'hexa-priority-review-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { saved = {}; }

function read() {
  return validateDraft({
    mode: $('#mode').value,
    name: $('#name').value,
    source: $('#source').value,
    names: Object.fromEntries([...document.querySelectorAll('[data-name]')].map(input => [input.dataset.name, input.value])),
    steps: parseSteps($('#steps').value)
  });
}
function show(draft) {
  $('#name').value = draft.name;
  $('#source').value = draft.source || '';
  $('#steps').value = draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n');
  $('#names').innerHTML = NODES.map(node => `<div class="review-name"><label for="name-${node.short}">${node.short}</label><input id="name-${node.short}" data-name="${node.short}" type="text"></div>`).join('');
  for (const input of document.querySelectorAll('[data-name]')) input.value = draft.names[input.dataset.name] || '';
  $('#status').textContent = '';
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
$('#review').addEventListener('click', () => {
  try {
    const draft = read();
    const changes = compareDraft(draft);
    message(`${draft.steps.length} steps. ${changes.changedNames} display names changed. ${changes.changedSteps} steps changed at their position. ${changes.lengthDifference} net steps.`);
  } catch (error) { message(error.message, true); }
});
$('#download').addEventListener('click', () => {
  try {
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
