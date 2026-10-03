// One tab-local action. Saved progress and game/source data keep their formats.
import { reconcileInfographicUndo } from './infographic-progress.js';

const fields = ['levels', 'statLines', 'statUnlocked', 'statCompleted'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function captureSkillProgress(saved, skill) {
  const progress = {};
  for (const field of fields) {
    if (Object.hasOwn(saved[field] || {}, skill)) progress[field] = structuredClone(saved[field][skill]);
  }
  const history = {};
  for (const [mode, record] of Object.entries(saved.infographicUndo || {})) {
    const skills = Object.fromEntries(Object.entries(record.skills || {}).filter(([, stack]) =>
      Array.isArray(stack) && stack.some(item => item.skill === skill)));
    if (Object.keys(skills).length) history[mode] = structuredClone({sequence:record.sequence, skills});
  }
  return {progress, history};
}

export function createProgressUndo() {
  let action = null;
  return {
    clear() { action = null; },
    record({skill, label, scope, before, after}) {
      if (same(before.progress, after.progress)) return false;
      action = structuredClone({skill, label, scope, before, after});
      return true;
    },
    current(saved, scope) {
      if (action && (action.scope !== scope || !same(action.after, captureSkillProgress(saved, action.skill)))) action = null;
      return action;
    },
    restore(saved, scope, contexts) {
      const step = this.current(saved, scope);
      if (!step) return null;
      for (const field of fields) {
        saved[field] ||= {};
        if (Object.hasOwn(step.before.progress, field)) saved[field][step.skill] = structuredClone(step.before.progress[field]);
        else delete saved[field][step.skill];
      }
      restoreProgressHistory(saved, step.before.history, contexts);
      action = null;
      return {skill:step.skill, label:step.label};
    }
  };
}

export function restoreProgressHistory(saved, histories, contexts) {
  // Validate only the affected skill's prior stacks. Other skills' histories
  // are never replaced, and changed/removed source orders cannot be revived.
  for (const [mode, history] of Object.entries(histories)) {
    const source = contexts[mode];
    if (!source || history.sequence !== source.context.sequence) continue;
    const candidate = {...saved, infographicUndo:{[mode]:structuredClone(history)}};
    reconcileInfographicUndo(candidate, source.context, source.entries);
    const valid = candidate.infographicUndo[mode]?.skills;
    if (!valid || !Object.keys(valid).length) continue;
    saved.infographicUndo ||= {};
    const current = saved.infographicUndo[mode];
    if (current && current.sequence !== history.sequence) continue;
    saved.infographicUndo[mode] ||= {sequence:history.sequence, skills:{}};
    Object.assign(saved.infographicUndo[mode].skills, valid);
  }
}
