// Owner-supplied weekly rewards, independent of captured upgrade data.
export const DUNGEON_WEEKLY_FRAGMENTS = Object.freeze({none:0, highMountain:40, anglerCompany:55, nightmareParadise:70});
export const ERDA_REQUEST_WEEKLY_FRAGMENTS = 90;
export const normaliseDungeon = choice => Object.hasOwn(DUNGEON_WEEKLY_FRAGMENTS, choice) ? choice : 'none';
export const fragmentShortfall = (cost, owned) => Math.max(0, cost - owned);
export function effectiveDailyFragments(perday, erdaRequest, dungeon) {
  return perday + ((erdaRequest ? ERDA_REQUEST_WEEKLY_FRAGMENTS : 0) + DUNGEON_WEEKLY_FRAGMENTS[normaliseDungeon(dungeon)]) / 7;
}
export const fragmentDays = (cost, owned, rate) => rate > 0 ? fragmentShortfall(cost, owned) / rate : null;

export function fragmentDuration(days, perday) {
  if (days === null) return null;
  if (perday > 0) return `${days.toFixed(1)} days`;
  const weeks = Number((days / 7).toFixed(1));
  return `~${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
}

export function fragmentCompletionDate(days, today = new Date()) {
  if (days === null || !Number.isFinite(days) || days < 0) return null;
  const finish = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Add local calendar days, so daylight-saving changes cannot shift the date.
  finish.setDate(finish.getDate() + Math.ceil(days));
  return Number.isFinite(finish.getTime()) ? finish.toLocaleDateString(undefined, {dateStyle:'medium'}) : null;
}
