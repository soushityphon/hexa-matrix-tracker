import { createPlayerStorage } from './player-storage.js';

// UI wiring for the existing protected per-class storage. Mutation decisions
// and unfinished progress inputs remain with the tracker action handlers.
export function createSaveUI({ document, window, getStorage, isReady, getContext, classes, classNames, onPause }) {
  const $ = selector => document.querySelector(selector);
  const storage = createPlayerStorage(getStorage, ({ key, reason }) => {
    if (isReady() && key !== getContext().key) return;
    const status = $('#save-status');
    status.hidden = !reason || reason === 'conflict';
    status.textContent = reason === 'damaged'
      ? 'Saved progress is damaged. The original record is preserved. Changes stay in this session and cannot be saved until the record is recovered.'
      : reason === 'unreadable'
        ? 'Saved progress could not be read. Changes stay in this session. Reload once browser storage is available to restore your saved progress.'
        : reason === 'unsaved' ? 'Changes are not saved. Keep this tab open. Progress stays in this session while browser storage is unavailable.' : '';
    if (isReady()) syncConflict();
  }, operation => window.navigator.locks?.request
    ? window.navigator.locks.request('hexa-tracker-progress-v1', operation)
    : Promise.reject(new Error('Cross-tab saving is unavailable')));

  function syncConflict() {
    const { key, className, sourcePaused, pending } = getContext();
    const conflict = storage.conflict(key);
    $('#save-conflict').hidden = !conflict;
    $('#conflict-message').textContent = conflict ? `Saved ${classNames[className]} progress changed in another tab. Editing is paused.` : '';
    $('#load-latest-save').disabled = sourcePaused || pending;
    $('#continue-tab-save').disabled = sourcePaused || pending;
    onPause();
  }
  const checkActive = () => storage.check(getContext().key);
  function observe() {
    // Detect external writes before action handlers mutate saved progress,
    // while leaving the user's unfinished input values in place.
    for (const type of ['input', 'change', 'click']) document.addEventListener(type, checkActive, true);
    window.addEventListener('storage', event => {
      if (event.key === null || event.key?.startsWith('hexa-tracker-')) {
        for (const name of Object.keys(classes)) storage.check('hexa-tracker-' + name + '-v1');
        syncConflict();
      }
    });
  }
  return { storage, syncConflict, checkActive, observe };
}
