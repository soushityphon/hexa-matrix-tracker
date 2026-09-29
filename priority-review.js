import { NODES, PRIORITY_SETTINGS } from './data.js';
import { compareDraft, parseSteps, validateDraft } from './priority-draft.js';
import { inspectScouterResponse, resolveScouterResponse } from './scouter-import.js';
import { extractScouterOrder } from './scouter-extract.js';
import { loadPreview, previewCatalog, matchingPriorityVersion, fetchSharedPreview, saveSharedPreview, removeSharedPreview } from './preview-priorities.js';
import { skillAccent } from './skill-colours.js';

const $ = selector => document.querySelector(selector);
const key = 'hexa-priority-review-v1';
let saved = {};
let inspected = null;
let importedNodes = [];
let importedSteps = null;
let importedStatIcons = {};
let version = null;
let previewDrafts = {};
let catalog = previewCatalog(previewDrafts);
let materialIssues = 0;
let pendingSource = '';
const recentOrders = new Map();
const recentFailures = new Map();
const recentOrderMs = 5 * 60 * 1000;
const limitKey = 'hexa-scouter-pause-until';
let pauseUntil = 0;
try { pauseUntil = Number(sessionStorage.getItem(limitKey)) || 0; } catch { /* Session storage may be unavailable. */ }
try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { saved = {}; }
const registeredModes = () => Object.keys(catalog.priorities).filter(mode => catalog.priorities[mode].length);
function contextLabel(mode) {
  const settings = PRIORITY_SETTINGS[mode];
  const update = { hecate: 'Historical Hecate', lotus: 'GMS Lotus', taotie: 'KMS Taotie' }[settings.patch];
  const material = settings.world === 'heroic' ? 'Fragments (Heroic)' : 'Sol Erda (Interactive)';
  return `Hoyoung · ${update} · ${material}`;
}
function sourceOptions() {
  return Object.keys(PRIORITY_SETTINGS).map(mode => new Option(contextLabel(mode), mode));
}
function blankDraft(mode) {
  return { mode, sourceMode: mode, isNew: false, enabled: false, name: '', source: '',
    names: Object.fromEntries(NODES.map(node => [node.short, node.name])), steps: [], newNodes: [], statIcons: {} };
}
function refreshCatalog() {
  catalog = previewCatalog(previewDrafts);
  const selected = $('#mode').value;
  $('#mode').replaceChildren(...sourceOptions());
  $('#mode').value = selected || 'lotus_heroic';
  renderRegistered();
}
function visibility(value) {
  document.querySelectorAll('[name="visibility"]').forEach(input => { input.checked = value !== null && input.value === (value ? 'enabled' : 'disabled'); });
}
function renderRegistered() {
  const modes = registeredModes();
  $('#registered-count').textContent = `(${modes.length})`;
  const list = $('#registered');
  list.replaceChildren();
  for (const mode of modes) {
    const settings = catalog.settings[mode];
    const row = document.createElement('article'); row.className = 'registered-row';
    const details = document.createElement('div'); details.className = 'registered-details';
    const title = document.createElement('strong'); title.textContent = catalog.labels[mode];
    const source = document.createElement('small');
    const date = catalog.sources[mode]?.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || 'Date not recorded';
    source.textContent = `${settings.patch === 'taotie' ? 'KMS Taotie' : 'GMS Lotus'} · ${settings.world === 'heroic' ? 'Fragments (Heroic)' : 'Sol Erda (Interactive)'} · ${catalog.priorities[mode].length} steps · ${date} · Saved on test site`;
    const note = document.createElement('small'); note.textContent = catalog.sources[mode] || 'Source not recorded';
    details.append(title, source, note);
    const actions = document.createElement('div'); actions.className = 'registered-actions';
    const badge = document.createElement('span'); badge.className = settings.enabled ? 'visible' : 'disabled'; badge.textContent = `${settings.enabled ? 'Visible' : 'Hidden'} on test site`;
    const review = document.createElement('button'); review.type = 'button'; review.textContent = 'Review';
    review.addEventListener('click', () => { $('#mode').value = previewDrafts[mode].sourceMode; show(previewDrafts[mode]); $('#draft-heading').scrollIntoView({ behavior: 'smooth' }); });
    const rename = document.createElement('button'); rename.type = 'button'; rename.textContent = 'Rename';
    rename.addEventListener('click', () => { review.click(); $('#name').focus(); });
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = settings.enabled ? 'Disable' : 'Enable';
    toggle.addEventListener('click', async () => {
      try {
        const draft = { ...previewDrafts[mode], enabled: !settings.enabled };
        await saveSharedPreview(draft);
        previewDrafts[draft.mode] = draft;
        refreshCatalog();
        show(draft);
        message(`${draft.name} is ${draft.enabled ? 'visible' : 'hidden'} on the private test tracker. Public publishing is a separate step.`);
      } catch (error) { message(error.message, true); }
    });
    actions.append(badge, review, rename, toggle);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove saved version';
    remove.addEventListener('click', async () => {
      if (!confirm(`Remove ${previewDrafts[mode].name} from the private test site? This removes its saved order.`)) return;
      try { const sourceMode = previewDrafts[mode].sourceMode; await removeSharedPreview(mode); delete previewDrafts[mode]; refreshCatalog(); show(blankDraft(sourceMode)); message('Saved version removed from the private test site.'); }
      catch (error) { message(error.message, true); }
    });
    actions.append(remove);
    row.append(details, actions); list.append(row);
  }
}

function matchingVersion(steps, sourceMode) {
  return matchingPriorityVersion(steps, sourceMode, previewDrafts);
}
function classifyOrder() {
  const sourceMode = $('#mode').value;
  const steps = parseSteps($('#steps').value, importedNodes.map(node => node.short));
  const settings = PRIORITY_SETTINGS[sourceMode];
  const match = matchingVersion(steps, sourceMode);
  if (match) {
    const existing = previewDrafts[match];
    const matched = importedSteps?.length === steps.length && importedSteps.every((step, index) => step.skill === steps[index].skill && step.level === steps[index].level);
    show({ ...existing, steps: matched ? importedSteps : existing.steps });
    message(`No new priority: ${steps.length} steps match your saved test site version, ${existing.name}. Save to retain any newly captured source FD.`);
    return;
  } else {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const base = `${settings.patch}_${settings.world}_${stamp}`;
    let mode = base;
    for (let number = 2; Object.hasOwn(catalog.priorities, mode); number++) mode = `${base}_${number}`;
    version = { sourceMode, mode, isNew: true };
    $('#priority-id').value = mode;
    $('#name').value = '';
    $('#source').value = pendingSource;
    visibility(null);
    $('#version-state').textContent = 'New order. Name it and choose whether to show it on the tracker.';
    message(`New priority: ${steps.length} steps. Name it, choose visibility, then save it to the preview tracker.`);
  }
}
function compareResponse(response) {
  const extracted = extractScouterOrder(response, $('#mode').value);
  materialIssues = extracted.validation.issues.length;
  pendingSource = `Maple Scouter ${$('#mode').value.startsWith('taotie_') ? 'KMS Taotie' : 'GMS Lotus'} ${$('#mode').value.endsWith('_heroic') ? 'Fragments' : 'Sol Erda'}, checked ${new Date().toISOString().slice(0, 10)}${extracted.source.standard ? `, benchmark ${String(extracted.source.standard).slice(0, 80)}` : ''}`;
  inspected = inspectScouterResponse(response);
  renderUnknown(inspected.unknown);
  importedNodes = [];
  importedStatIcons = inspected.statIcons;
  if (!inspected.unknown.length) {
    collectUnknown();
    classifyOrder();
    inspected = null;
    persist();
  } else {
    message(`${inspected.unknown.length} new skill(s) need a name and type. Enter them, then review changes.`);
    $('#unknown-list [data-field="short"]')?.focus();
  }
  if (materialIssues) message(`${extracted.count} rows imported. ${materialIssues} material check(s) need review.`, true);
}

function read() {
  const choice = document.querySelector('[name="visibility"]:checked');
  if (!choice) throw new Error('Choose whether this priority will be visible on the tracker');
  return validateDraft({
    ...version,
    name: $('#name').value,
    enabled: choice.value === 'enabled',
    source: $('#source').value,
    names: Object.fromEntries([...document.querySelectorAll('[data-name]')].map(input => [input.dataset.name, input.value])),
    newNodes: importedNodes,
    statIcons: importedStatIcons,
    steps: parseSteps($('#steps').value, importedNodes.map(node => node.short)).map((step, index) => {
      const source = importedSteps?.[index];
      return source?.skill === step.skill && source.level === step.level ? { ...step, ...(source.fdGain === undefined ? {} : { fdFrom: source.fdFrom, fdGain: source.fdGain }) } : step;
    })
  });
}
function show(draft) {
  importedSteps = draft.steps;
  version = { mode: draft.mode, sourceMode: draft.sourceMode || draft.mode, isNew: draft.isNew === true };
  $('#mode').value = version.sourceMode;
  $('#review-context').textContent = contextLabel(version.sourceMode);
  inspected = null;
  importedNodes = draft.newNodes || [];
  importedStatIcons = draft.statIcons || {};
  materialIssues = 0;
  $('#unknown').hidden = true;
  $('#unknown-list').replaceChildren();
  $('#name').value = draft.name;
  $('#priority-id').value = draft.mode;
  visibility(draft.isNew && typeof draft.enabled !== 'boolean' ? null : draft.enabled === true);
  $('#version-state').textContent = draft.isNew ? 'New order. Name it and choose whether to show it on the tracker.' : `${catalog.priorities[draft.mode]?.length || draft.steps.length} imported steps. Save to the private test tracker, then review before public publishing.`;
  $('#source').value = draft.source || '';
  $('#steps').value = draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n');
  $('#names').innerHTML = NODES.map(node => `<div class="review-name" style="--skill-accent:${skillAccent(node.short)}"><label for="name-${node.short}"><img src="${node.icon}" alt=""><span>${node.short}</span></label><input id="name-${node.short}" data-name="${node.short}" type="text"></div>`).join('');
  document.querySelectorAll('.review-name img').forEach(img => {
    img.addEventListener('error', () => { img.hidden = true; });
    if (img.complete && !img.naturalWidth) img.hidden = true;
  });
  for (const input of document.querySelectorAll('[data-name]')) input.value = draft.names[input.dataset.name] || '';
  $('#status').textContent = '';
  $('#open-preview').hidden = true;
  const historical = draft.sourceMode.startsWith('hecate_');
  if (historical) message('Historical Hecate needs a pasted Maple Scouter response.');
}
function collectUnknown() {
  if (!inspected) return;
  const mappings = {};
  for (const card of document.querySelectorAll('.unknown-card')) {
    mappings[card.dataset.key] = Object.fromEntries(['short', 'name', 'type'].map(field => [field, card.querySelector(`[data-field="${field}"]`).value]));
  }
  const resolved = resolveScouterResponse(inspected, mappings);
  importedSteps = resolved.steps;
  importedNodes = resolved.newNodes;
  importedStatIcons = resolved.statIcons;
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
$('#mode').addEventListener('change', () => show(saved[$('#mode').value] || blankDraft($('#mode').value)));
document.addEventListener('input', persist);
async function checkMode(mode) {
  try {
    const failure = recentFailures.get(mode);
    if (failure && Date.now() - failure.at < 60_000) return { mode, error: `${failure.error} Try again in a minute.` };
    const cached = recentOrders.get(mode);
    let result;
    if (cached && Date.now() - cached.at < recentOrderMs) result = cached.result;
    else {
      const response = await fetch('/api/hexa-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode })
      });
      if (!response.ok) throw new Error((await response.text()).slice(0, 160) || `Request returned ${response.status}`);
      result = await response.json();
      recentOrders.set(mode, { at: Date.now(), result });
      recentFailures.delete(mode);
    }
    const extracted = extractScouterOrder(result, mode);
    const match = extracted.unknown.length ? null : matchingVersion(extracted.steps, mode);
    return { mode, result, steps: extracted.count, unknown: extracted.unknown.length, issues: extracted.validation.issues.length, match };
  } catch (error) {
    recentFailures.set(mode, { at: Date.now(), error: error.message });
    const limited = /Maple Scouter returned (?:429|430)\b/.test(error.message);
    if (limited) {
      pauseUntil = Date.now() + 5 * 60 * 1000;
      try { sessionStorage.setItem(limitKey, String(pauseUntil)); } catch { /* Keep the in-page pause. */ }
    }
    return { mode, error: error.message, limited };
  }
}
function renderCheck(check) {
  const row = document.createElement('div');
  row.className = `check-result${check.error ? ' error' : ''}`;
  const label = document.createElement('span');
  const world = `${check.mode.startsWith('taotie_') ? 'KMS Taotie' : 'GMS Lotus'} ${check.mode.endsWith('_heroic') ? 'Fragments' : 'Sol Erda'}`;
  label.textContent = check.error ? `${world}: ${check.error}`
    : check.unknown ? `${world}: ${check.unknown} new skill(s) need setup.`
    : check.match ? `${world}: matches ${catalog.labels[check.match]} (${check.steps} steps; ${check.issues} material checks).`
    : `${world}: new order (${check.steps} steps; ${check.issues} material checks). Name and review it.`;
  row.append(label);
  if (!check.error && !check.match) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Review';
    button.addEventListener('click', () => {
      $('#mode').value = check.mode;
      show(saved[check.mode] || blankDraft(check.mode));
      $('#response').value = JSON.stringify(check.result);
      try { compareResponse(check.result); }
      catch (error) { message(error.message, true); }
      if (!check.unknown) $('#name').focus();
    });
    row.append(button);
  }
  $('#checks').append(row);
}
$('#retrieve').addEventListener('click', async () => {
  if (Date.now() < pauseUntil) {
    $('#checks').textContent = 'Maple Scouter refused a recent request. Please wait five minutes before checking again.';
    return;
  }
  $('#retrieve').disabled = true;
  $('#checks').replaceChildren();
  const modes = ['lotus_heroic', 'lotus_interactive', 'taotie_heroic', 'taotie_interactive'];
  for (const [index, mode] of modes.entries()) {
    if (index && !recentOrders.has(mode)) await new Promise(resolve => setTimeout(resolve, 2000));
    const result = await checkMode(mode);
    renderCheck(result);
    if (result.limited) {
      const note = document.createElement('p');
      note.textContent = 'The remaining orders were not requested. Maple Scouter refused this request, so checks are paused for five minutes.';
      $('#checks').append(note);
      break;
    }
  }
  $('#retrieve').disabled = false;
});
$('#inspect').addEventListener('click', () => {
  try {
    compareResponse(JSON.parse($('#response').value));
  } catch (error) { message(error.message, true); }
});
$('#response-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const content = await file.text();
    $('#response').value = content;
    compareResponse(JSON.parse(content));
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
    const changes = compareDraft(draft, previewDrafts[draft.mode]?.steps || []);
    message(`${draft.steps.length} steps. ${changes.changedNames} display names changed. ${changes.changedSteps} steps changed at their position. ${changes.lengthDifference} net steps.`);
  } catch (error) { message(error.message, true); }
});
$('#save-preview').addEventListener('click', async () => {
  try {
    collectUnknown();
    if (inspected) {
      classifyOrder();
      inspected = null;
    }
    if (materialIssues) throw new Error(`${materialIssues} material checks need review before saving this order to the preview tracker.`);
    const draft = read();
    await saveSharedPreview(draft);
    previewDrafts[draft.mode] = draft;
    saved[draft.sourceMode] = draft;
    localStorage.setItem(key, JSON.stringify(saved));
    refreshCatalog();
    $('#open-preview').href = `index.html?mode=${encodeURIComponent(draft.mode)}`;
    $('#open-preview').hidden = !draft.enabled;
    message(`${draft.name} saved to the private test tracker as ${draft.enabled ? 'visible' : 'hidden'}. Public publishing is a separate step.`);
  } catch (error) { message(error.message, true); }
});
$('#download').addEventListener('click', () => {
  try {
    collectUnknown();
    if (inspected) {
      classifyOrder();
      inspected = null;
    }
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
$('#mode').replaceChildren(...sourceOptions());
$('#mode').value = 'lotus_heroic';
show(saved[$('#mode').value] || blankDraft($('#mode').value));
message('Loading saved priorities from the private test site…');
$('#save-preview').disabled = true;
$('#retrieve').disabled = true;
try {
  previewDrafts = await fetchSharedPreview();
  refreshCatalog();
  message('Shared priorities are ready. Save applies changes to the private test tracker.');
  const browserDrafts = loadPreview(localStorage);
  const legacy = Object.values(browserDrafts).filter(draft => !previewDrafts[draft.mode]);
  if (legacy.length) {
    $('#move-browser').hidden = false;
    $('#move-browser').textContent = `Move ${legacy.length} browser preview${legacy.length === 1 ? '' : 's'} to test site`;
    $('#move-browser').addEventListener('click', async () => {
      try {
        for (const draft of legacy) { await saveSharedPreview(draft); previewDrafts[draft.mode] = draft; }
        localStorage.removeItem('hexa-priority-preview-v1');
        refreshCatalog();
        $('#move-browser').hidden = true;
        message(`${legacy.length} browser preview${legacy.length === 1 ? '' : 's'} saved to the private test site.`);
      } catch (error) { message(`Some previews could not be moved: ${error.message}`, true); }
    });
  }
  $('#save-preview').disabled = false;
  $('#retrieve').disabled = false;
} catch (error) { message(`Shared priorities could not be loaded: ${error.message}. Try reloading this page.`, true); }
