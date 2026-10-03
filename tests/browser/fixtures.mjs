// Isolated UI fixtures, never imported by the app or deployed to the Site.
// Hoyoung orders/materials/FD are synthetic layout stimuli, not game evidence.
// Ren uses retained capture schedules/order, with synthetic pair names/progress.
import { readFileSync } from 'node:fs';
import { NODES, COSTS, STAT_ICONS } from '../../data.js';
import { currentDraft } from '../../priority-draft.js';
import { validatePair } from '../../admin-panel-model.js';
import { reconstructScouterOrder, discoverySelection } from '../../scouter-discovery.js';
import { renDraftFromCapture, renCatalogueFromDrafts } from '../../ren-priority.js';

const stats = Object.keys(STAT_ICONS);
const pair = (job, id, orders) => Object.fromEntries(validatePair({
  job, id, name: id === 'qa_full' ? 'QA full order' : 'QA hidden skills',
  region: 'GMS', enabled: true, orders
}).map(draft => [draft.mode, draft]));
const capturedCosts = Object.fromEntries(NODES.map(node => [node.short, {
  freeBaseLevel: node.short === 'Apotheosis' ? 1 : 0,
  levels: COSTS[node.type]
}]));
const hySteps = [2, 6, 30].flatMap((level, round) => NODES.filter(node => !['Janus', 'Taotie'].includes(node.short)).map(node => ({
  skill: node.short, level,
  fdFrom: round ? [2, 6][round - 1] : node.short === 'Apotheosis' ? 1 : 0,
  fdGain: 1.234
})));
const hyBase = { ...currentDraft('lotus_heroic'), steps: [...hySteps, ...stats.map(skill => ({ skill, level: 20 }))],
  statIcons: STAT_ICONS, capturedCosts,
  costProvenance: { capturedAt: '2026-10-01T00:00:00Z', resources: [{ url: 'https://maplescouter.com/qa-synthetic-layout.js', sha256: 'a'.repeat(64) }] }
};
const hy = pair('호영', 'qa_full', { heroic: hyBase, interactive: hyBase });
Object.assign(hy, pair('호영', 'qa_hidden', {
  heroic: { ...hyBase, steps: hyBase.steps.filter(step => !['Tiger', 'Apparition'].includes(step.skill)) },
  interactive: hyBase
}));
// Verified semantic ordinals, independent of icon filename suffixes 10/12.
const sourceKeys = ['skillCore1', 'skillCore2', 'skillCore3', 'masteryCore1', 'masteryCore2', 'masteryCore3', 'masteryCore4', 'reinCore1', 'reinCore2', 'reinCore3', 'reinCore4', 'generalCore1', 'generalCore2', 'generalCore3'];
const hyModel = {
  nodes: NODES.map((node, i) => ({ ...node, costs: COSTS[node.type], initialLevel: node.short === 'Apotheosis' ? 1 : 0, sourceKey: sourceKeys[i] })),
  stats: stats.map((short, i) => ({ short, name: short, icon: STAT_ICONS[short], sourceKey: 'hexaStat' + (i + 1) }))
};
const evidence = JSON.parse(readFileSync(new URL('../../data/scouter-ren-kms-heroic-response-2026-10-01.json', import.meta.url)));
const catalogue = { ...evidence.catalogue, provenance: { costs: { ...evidence.catalogue.provenance.costs, capturedAt: '2026-10-01T00:00:00Z' } } };
const candidate = reconstructScouterOrder(evidence.response, catalogue, discoverySelection('GMS', 'Heroic'), catalogue.sourceIconOverrides);
candidate.provenance = { response: { capturedAt: '2026-10-01T00:00:00Z', sha256: 'b'.repeat(64) } };
catalogue.provenance.costs.capturedAt = '2026-10-01T00:00:00Z';
const renBase = renDraftFromCapture(candidate, catalogue);
const ren = pair('렌', 'qa_full', { heroic: renBase, interactive: { ...renBase, sourceMode: 'ren_gms_interactive' } });
Object.assign(ren, pair('렌', 'qa_hidden', {
  heroic: { ...renBase, steps: renBase.steps.filter(step => step.skill !== 'ren_reinCore1') },
  interactive: { ...renBase, sourceMode: 'ren_gms_interactive' }
}));
export const fixtures = {
  hoyoung: { model: hyModel, drafts: hy },
  ren: { model: renCatalogueFromDrafts(ren), drafts: ren }
};
export const progress = Object.fromEntries(Object.entries(fixtures).map(([job, fixture]) => [job, {
  mode: 'qa_full_heroic', owned: 42, perday: 20,
  levels: Object.fromEntries(fixture.model.nodes.map((node, i) => [node.short, node.short === (job === 'ren' ? 'ren_reinCore1' : 'Tiger') ? 6 : i === 3 ? 30 : node.initialLevel || 0])),
  statUnlocked: { [stats[0]]: true, [stats[2]]: true },
  statLines: { [stats[0]]: [0, 0, 0], [stats[1]]: [2, null, 4], [stats[2]]: [6, 8, 6] }
}]));
