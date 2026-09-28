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

export function savePreview(storage, draft) {
  const valid = validateDraft(draft);
  if (valid.newNodes.length) throw new Error('New skills need a reviewed GitHub update before this tracker can calculate their costs. Download the draft for review.');
  const drafts = loadPreview(storage);
  drafts[valid.mode] = valid;
  storage.setItem(PREVIEW_KEY, JSON.stringify(drafts));
  return drafts;
}

export function removePreview(storage, mode) {
  const drafts = loadPreview(storage);
  delete drafts[mode];
  storage.setItem(PREVIEW_KEY, JSON.stringify(drafts));
  return drafts;
}
