// Checkpoint preparation and reversible progress actions, independent of the DOM.
// Stable catalogue IDs and exact priority sequences scope saved undo history.
import { statProgress, validateStatLines } from './hexa-stat.js';
import { priorityCheckpointGroups } from './planner.js';

export function infographicCheckpoints(order, nodes) {
  const bySkill = new Map(nodes.map(node => [node.short, node]));
  const occurrences = new Map(), seenStats = new Set();
  let unavailable=false;
  const checkpoints=order.flatMap(step => {
    const node = bySkill.get(step.skill);
    if (!node) {unavailable=true;return [];}
    const stat = node.type === 'HEXA Stat' || node.group === 'HEXA Stat' || node.isStat === true;
    const max = node.maxLevel ?? (stat ? 20 : 30);
    const min = node.initialLevel ?? 0;
    const target = stat ? max : step.level;
    if (!Number.isInteger(target) || target < min || target > max) {unavailable=true;return [];}
    const id = String(node.id ?? node.short);
    if (stat && seenStats.has(id)) return [];
    if (stat) seenStats.add(id);
    const identity = JSON.stringify([id, target]);
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);
    return [{key:JSON.stringify([id,target,occurrence]), id, skill:node.short, target, max, min, stat,
      label:target === max ? 'MAX' : String(target), name:node.name || node.short,
      icon:node.icon || '', node}];
  });
  return unavailable ? [] : checkpoints;
}

export function infographicContext(mode, entries) {
  return {mode, sequence:JSON.stringify(entries.map(entry => [entry.key,entry.skill,entry.min,entry.max,entry.stat]))};
}

function nodeState(saved, entry) {
  const level = Number.isInteger(saved.levels?.[entry.skill]) ? saved.levels[entry.skill] : entry.min;
  if (!entry.stat) return {level:Math.max(entry.min,Math.min(entry.max,level))};
  const lines = saved.statLines?.[entry.skill] ?? null;
  const complete = saved.statCompleted?.[entry.skill] === true;
  const total = statProgress(lines, level, complete).total;
  return {level:total, unlocked:total > 0 || saved.statUnlocked?.[entry.skill] === true,
    lines, complete};
}
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export const infographicDone = (saved, entry) => nodeState(saved,entry).level >= entry.target;

// Display changes with progress, but actions/history always use the complete
// source checkpoint catalogue and context. A clicked endpoint stays available
// for reverse-order undo, even when the remaining run grows after a click.
export function infographicDisplayCheckpoints(entries, saved, context) {
  const history=saved.infographicUndo?.[context.mode];
  const recorded=new Set(history?.sequence===context.sequence
    ? Object.values(history.skills || {}).flatMap(stack=>Array.isArray(stack)?stack.map(record=>record.key):[]) : []);
  const rows=entries.map(entry=>({...entry,done:infographicDone(saved,entry)}));
  // A condensed run uses its final target's source position, not the first
  // remaining step's position. Completed tiles must not be overtaken by MAX.
  const endpoints=new Set(priorityCheckpointGroups(rows).map(group=>group.at(-1).key));
  const display=[];
  for(const endpoint of rows) {
    if(!endpoints.has(endpoint.key))continue;
    const previous=display.at(-1);
    // Pre-existing adjacent completed levels need only their last endpoint.
    // Preserve every recorded click, including earlier locked undo steps.
    if(endpoint.done && previous?.done && previous.skill===endpoint.skill &&
      !recorded.has(previous.key) && !recorded.has(endpoint.key))display[display.length-1]=endpoint;
    else display.push(endpoint);
  }
  return display;
}

export function invalidateInfographicUndo(saved, skill) {
  for (const history of Object.values(saved.infographicUndo || {})) {
    for (const [id, stack] of Object.entries(history.skills || {})) {
      if (!Array.isArray(stack) || stack.some(record => record?.skill === skill)) delete history.skills[id];
    }
  }
}

export function reconcileInfographicUndo(saved, context, entries) {
  const history = saved.infographicUndo?.[context.mode];
  if (!history) return;
  if (!history.skills || typeof history.skills !== 'object' || Array.isArray(history.skills)) {delete saved.infographicUndo[context.mode];return;}
  if (history.sequence !== context.sequence) { delete saved.infographicUndo[context.mode]; return; }
  const byKey = new Map(entries.map(entry => [entry.key,entry]));
  for (const [id, stack] of Object.entries(history.skills || {})) {
    if (!Array.isArray(stack)) {delete history.skills[id];continue;}
    const entry = byKey.get(stack.at(-1)?.key);
    const valid = entry && Array.isArray(stack) && stack.length && stack.every((record,index) =>
      record?.before && record?.after && byKey.get(record.key)?.id === id && record.skill === entry.skill &&
      Number.isInteger(record.before.level) && Number.isInteger(record.after.level) && record.before.level <= entry.max &&
      same(record.after, index === stack.length - 1 ? nodeState(saved,entry) : stack[index + 1].before) &&
      record.after.level > record.before.level && record.before.level >= entry.min &&
      record.after.level === byKey.get(record.key).target);
    if (!valid) delete history.skills[id];
  }
}

export function infographicCanUndo(saved, context, entry) {
  const history = saved.infographicUndo?.[context.mode];
  const stack = history?.sequence === context.sequence && history.skills?.[entry.id];
  const record = Array.isArray(stack) && stack.at(-1);
  return !!record && record.key === entry.key && same(record.after,nodeState(saved,entry));
}

function writeState(saved, entry, state) {
  saved.levels = {...saved.levels, [entry.skill]:state.level};
  if (entry.stat) {
    saved.statUnlocked = {...saved.statUnlocked,[entry.skill]:state.unlocked};
    saved.statLines = {...saved.statLines,[entry.skill]:state.lines};
    saved.statCompleted = {...saved.statCompleted,[entry.skill]:state.complete};
  }
}

export function clickInfographicCheckpoint(saved, context, entries, key) {
  const entry = entries.find(entry => entry.key === key);
  if (!entry) return false;
  reconcileInfographicUndo(saved,context,entries);
  if (infographicDone(saved,entry)) {
    if (!infographicCanUndo(saved,context,entry)) return false;
    const stack = saved.infographicUndo[context.mode].skills[entry.id];
    const record = stack.pop();
    writeState(saved,entry,record.before);
    // A rollback also makes histories in other priorities stale.
    for (const [mode,history] of Object.entries(saved.infographicUndo)) {
      if (mode !== context.mode) delete history.skills[entry.id];
    }
    return true;
  }
  const before = structuredClone(nodeState(saved,entry));
  const after = entry.stat ? {...before,level:entry.target,unlocked:true,complete:true} : {level:entry.target};
  for (const [mode,history] of Object.entries(saved.infographicUndo || {})) {
    if (mode !== context.mode) delete history.skills[entry.id];
  }
  saved.infographicUndo ||= {};
  const history = saved.infographicUndo[context.mode] ||= {sequence:context.sequence,skills:{}};
  const stack = history.skills[entry.id] ||= [];
  stack.push({key:entry.key,skill:entry.skill,before,after:structuredClone(after)});
  writeState(saved,entry,after);
  return true;
}

// Real line entry replaces a mark only once the full split is valid. Partial
// details retain the existing completion, with FD blank until all 20 levels exist.
export function reconcileStatCompletion(saved, skill, lines) {
  if (validateStatLines(lines).complete) {
    saved.statCompleted = {...saved.statCompleted,[skill]:false};
  }
}
