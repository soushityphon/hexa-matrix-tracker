import { combinedSourceGain, rangeCost } from './planner.js';
import { skillAccent } from './skill-colours.js';
import { fragmentShortfall } from './fragment-calculator.js';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function materials(cost, days, shortfall = false) {
  return `<div class="materials">${materialAmount(cost.erda, 'erda')} ${materialAmount(cost.frags, 'frags', cost.rng, shortfall)}${days === null || cost.rng ? '' : ` <span class="material-days">/ ${days}</span>`}</div>`;
}

const materialIcons = {
  erda: { path: 'assets/sol-erda.png', name: 'Sol Erda' },
  frags: { path: 'assets/sol-erda-fragment.png', name: 'Fragments' }
};
export function materialAmount(value, type, rng = false, shortfall = false) {
  const { path, name } = materialIcons[type];
  const amount = rng ? (value ? `${value.toLocaleString()}+` : 'RNG') : value.toLocaleString();
  return `<span class="material-amount" aria-label="${rng ? (value ? `at least ${value.toLocaleString()}` : 'variable') : value.toLocaleString()} ${name}${shortfall ? ' needed' : ''}"><img src="${path}" alt=""><span aria-hidden="true">${amount}</span><span class="material-fallback" aria-hidden="true">${name}</span></span>`;
}



function typeClass(skill, nodeByShort) {
  if (skill.startsWith('HEXA Stat')) return 'stat';
  const type = nodeByShort[skill]?.type || '';
  if (type.startsWith('Skill')) return 'skill';
  if (type === 'V') return 'v';
  if (type.startsWith('Common')) return 'common';
  return 'mastery';
}

function upgradeAction(skill, target, label, nextLevel = false) {
  return `<button type="button" data-upgrade-skill="${skill}" data-upgrade-level="${target}" ${nextLevel ? 'data-next-level="true"' : ''} aria-label="${label} for ${skill}, to level ${target}">${label}</button>`;
}

function statAction(skill, action, label) {
  return `<button type="button" data-upgrade-skill="${skill}" data-stat-action="${action}" aria-label="${label} for ${skill}">${label}</button>`;
}

export const STAT_FD_NOTE='General average from the Inven-supplied HEXA Stat table, not personalised FD. Shown only with valid line levels totalling 20.';
export function fdExplanation(text,note,label) {
  return `<button type="button" class="fd-gain fd-info" data-fd-note="${escapeHtml(note)}" title="${escapeHtml(note)}" aria-label="${escapeHtml(label)} Open FD explanation." aria-haspopup="dialog" aria-controls="fd-explanation">${escapeHtml(text)}</button>`;
}
function fdText(result) {
  const note = result.estimated
    ? 'Approximate FD gain. The remaining gain within a partly completed Scouter step is estimated from its share of Fragment cost. Actual gain may differ.'
    : 'Approximate FD gain based on rounded Maple Scouter step values. Combined gains are compounded.';
  return fdExplanation(`${result.estimated ? '≈' : ''}+${result.gain.toFixed(3)}% FD`,note,`${result.estimated ? 'Estimated ' : ''}plus ${result.gain.toFixed(3)} percent final damage. ${note}`);
}
function upgradeCost(label, cost, time, action = '', owned = null) {
  const shortfall = owned !== null && !cost.rng;
  const displayCost = shortfall ? {...cost, frags:fragmentShortfall(cost.frags, owned)} : cost;
  return `<div class="upgrade-cost"><div class="upgrade-cost-details"><span>${label}</span>${materials(displayCost, time, shortfall)}</div>${action}</div>`;
}

// This renderer owns display markup only. The tracker supplies the current
// verified selection, levels and existing estimates after its pause/save guards.
export function createPriorityRenderer({document}) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  function checkMaterialIcons() {
    $$('.material-amount img, .material-heading img').forEach(img => {
      img.addEventListener('error', () => { img.parentElement.classList.add('icon-failed'); });
      if (img.complete && !img.naturalWidth) img.parentElement.classList.add('icon-failed');
    });
  }
  function renderPriority({nodeByShort, statNodes, draft, order, current, next,
    index, steps, displayRows, nextRow, statUnlocked, duration, inventory, hideDone}) {
    const priorityName = skill => {
      const tag=nodeByShort[skill]?.tag || statNodes.find(node=>node.short===skill)?.tag || '';
      return `${tag ? `<span class="skill-tag">${escapeHtml(tag)}</span> ` : ''}${escapeHtml(draft?.shortNames?.[skill] || nodeByShort[skill]?.shortName || statNodes.find(node=>node.short===skill)?.shortName || skill)}`;
    };
    const nextIsStat = next?.skill.startsWith('HEXA Stat');
    const nextLevel = next && !nextIsStat ? Math.min((current[next.skill] || 0) + 1, next.level) : null;
    const levelCost = next && !nextIsStat && rangeCost(next.skill, current[next.skill] || 0, nextLevel);
    const nextRowGain = nextRow && !nextIsStat ? combinedSourceGain(order, nextRow, current[nextRow.skill] || 0) : null;
    $('#next-upgrade').style.setProperty('--skill-accent', skillAccent(nextRow?.skill));
    const nextIcon = nextRow && (statNodes.find(node=>node.short===nextRow.skill)?.icon || draft?.statIcons[nextRow.skill] || nodeByShort[nextRow.skill]?.icon);
    const statStep = nextIsStat && (statUnlocked[next.skill]
      ? upgradeCost(`Completion · ${nextRow.level}`, nextRow.cost, null, statAction(next.skill, 'lines', 'Enter line levels'))
      : upgradeCost('Unlock', { ...nextRow.cost, rng: false }, duration({...nextRow.cost, rng:false}), statAction(next.skill, 'unlock', 'Mark unlocked'), inventory));
    $('#next-upgrade').innerHTML = `${next && nextRow ? `<div class="metric" style="--skill-accent:${skillAccent(nextRow.skill)}"><div class="upgrade-top"><small>Next Upgrade</small></div><div class="upgrade-heading"><div class="upgrade-label"><span class="node-icon" aria-hidden="true"><span>${nextRow.skill[0]}</span>${nextIcon ? `<img src="${nextIcon}" alt="">` : ''}</span><strong>${priorityName(nextRow.skill)} → ${nextRow.level}</strong></div>${nextRowGain === null ? '' : fdText(nextRowGain)}</div>${nextIsStat ? statStep : `${upgradeCost(`Level ${current[next.skill] || 0} → ${nextLevel}`, levelCost, duration(levelCost), upgradeAction(next.skill, nextLevel, 'Add 1 Level', true), inventory)}${nextRow.level === nextLevel ? '' : upgradeCost(`Level ${current[next.skill] || 0} → ${nextRow.level} · Checkpoint`, nextRow.cost, duration(nextRow.cost), upgradeAction(next.skill, nextRow.level, 'Add to checkpoint'), inventory)}`}</div>` : `<div class="metric"><strong>${steps.length ? 'Priority complete' : 'Maple Scouter order pending'}</strong></div>`}`;
    $$('#next-upgrade .upgrade-heading img').forEach(img => {
      img.addEventListener('error', () => { img.hidden = true; });
      if (img.complete && !img.naturalWidth) img.hidden = true;
    });
    let remainingIndex = 0;
    $('#priority').innerHTML = displayRows.map((row, rowIndex) => {
      const cost = row.cost;
      const number = value => value === 0 ? '<span class="zero">0</span>' : value.toLocaleString();
      if (!row.done) remainingIndex++;
      const displayIndex = hideDone && !row.done ? remainingIndex : rowIndex + 1;
      const icon = statNodes.find(node=>node.short===row.skill)?.icon || draft?.statIcons[row.skill] || nodeByShort[row.skill]?.icon;
      const isNext = row.index <= index + 1 && index + 1 <= row.endIndex;
      const gain = row.done || row.skill.startsWith('HEXA Stat') ? null : combinedSourceGain(order, row, current[row.skill] || 0);
      const fd = gain === null ? '' : fdText(gain);
      return `<tr class="type-${typeClass(row.skill, nodeByShort)} ${row.done ? 'done' : ''} ${isNext ? 'next' : ''}" ${isNext ? 'aria-current="step"' : ''} style="--skill-accent:${skillAccent(row.skill)}"><td>${displayIndex}</td><td><span class="skill-cell">${icon ? `<img class="stat-icon" src="${icon}" alt="">` : '<i class="dot" aria-hidden="true"></i>'}<span>${priorityName(row.skill)}</span></td><td>${row.level}</td><td>${number(cost.erda)}</td><td>${cost.rng ? `<span class="rng" aria-label="${cost.frags ? `at least ${cost.frags} Fragments` : 'variable Fragment cost'}">${cost.frags ? `${cost.frags.toLocaleString()}+` : 'RNG'}</span>` : number(cost.frags)}</td><td>${fd}</td></tr>`;
    }).join('');
  }
  return {renderPriority, checkMaterialIcons};
}
