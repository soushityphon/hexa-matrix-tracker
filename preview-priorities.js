import { PRIORITIES, PRIORITY_LABELS, PRIORITY_SETTINGS, PRIORITY_SOURCES } from './data.js';
import { validateDraft } from './priority-draft.js';

export const PREVIEW_KEY = 'hexa-priority-preview-v1';

export function loadPreview(storage) {
  let raw;
  try { raw = JSON.parse(storage.getItem(PREVIEW_KEY) || '{}'); }
  catch { return {}; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const drafts = {};
  for (const [mode, value] of Object.entries(raw)) {
    try {
      const draft = validateDraft(value);
      if (draft.mode === mode && !draft.newNodes.length) drafts[mode] = draft;
    } catch { /* Ignore incomplete or old browser drafts. */ }
  }
  return drafts;
}

export function previewCatalog(drafts) {
  const priorities = { ...PRIORITIES };
  const labels = { ...PRIORITY_LABELS };
  const settings = { ...PRIORITY_SETTINGS };
  const sources = { ...PRIORITY_SOURCES };
  for (const draft of Object.values(drafts)) {
    const base = PRIORITY_SETTINGS[draft.sourceMode];
    priorities[draft.mode] = draft.steps;
    labels[draft.mode] = draft.name;
    settings[draft.mode] = { ...base, enabled: draft.enabled };
    sources[draft.mode] = draft.source;
  }
  return { priorities, labels, settings, sources };
}

export function matchingPriorityVersion(steps, sourceMode, drafts) {
  const source = PRIORITY_SETTINGS[sourceMode];
  if (!source) return null;
  const sameOrder = order => order.length === steps.length && order.every((step, index) =>
    step.skill === steps[index].skill && step.level === steps[index].level);
  // A saved Scouter import takes precedence when an older repository capture has
  // the same checkpoints. Keep the latter available until the D1 migration.
  for (const [mode, draft] of Object.entries(drafts)) {
    const context = PRIORITY_SETTINGS[draft.sourceMode];
    if (context?.patch === source.patch && context.world === source.world && sameOrder(draft.steps)) return mode;
  }
  return Object.keys(PRIORITIES).find(mode => PRIORITY_SETTINGS[mode].patch === source.patch &&
    PRIORITY_SETTINGS[mode].world === source.world && PRIORITIES[mode].length && sameOrder(PRIORITIES[mode])) || null;
}

async function previewRequest(method, value) {
  const response = await fetch('/api/priority-preview', {
    method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(value) }), cache: 'no-store'
  });
  if (!response.ok) throw new Error((await response.text()).slice(0, 200) || `Priority storage returned ${response.status}`);
  return response.json();
}

export async function fetchSharedPreview() {
  const { drafts } = await previewRequest('GET');
  const valid = {};
  for (const [mode, value] of Object.entries(drafts || {})) {
    try {
      const draft = validateDraft(value);
      if (draft.mode === mode && !draft.newNodes.length) valid[mode] = draft;
    } catch { /* Ignore stale previews. */ }
  }
  return valid;
}

export async function saveSharedPreview(draft) {
  const valid = validateDraft(draft);
  if (valid.newNodes.length) throw new Error('New skills need a reviewed GitHub update before this tracker can calculate their costs. Download the draft for review.');
  await previewRequest('PUT', { draft: valid });
  return valid;
}

export async function removeSharedPreview(mode) {
  await previewRequest('DELETE', { mode });
}
