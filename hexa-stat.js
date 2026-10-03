// Owner-approved general averages, issue #23, 1 October 2026.
// Private Hoyoung Hexa Matrix Planner.xlsx, hexastat-0 A/B/C/E.
// FD is stored in percentage points, not spreadsheet fractions.
export const STAT_FD_ROWS = [
  [4,8,8,3.022],
  [4,9,7,3.047],
  [3,9,8,3.054],
  [2,9,9,3.061],
  [4,10,6,3.073],
  [3,10,7,3.08],
  [2,10,8,3.086],
  [1,10,9,3.093],
  [0,10,10,3.099],
  [5,8,7,3.151],
  [5,9,6,3.177],
  [5,10,5,3.209],
  [6,7,7,3.287],
  [6,8,6,3.295],
  [6,9,5,3.309],
  [6,10,4,3.325],
  [7,7,6,3.49],
  [7,8,5,3.498],
  [7,9,4,3.504],
  [7,10,3,3.511],
  [8,6,6,3.854],
  [8,7,5,3.862],
  [8,8,4,3.876],
  [8,9,3,3.876],
  [8,10,2,3.882],
  [9,6,5,4.225],
  [9,7,4,4.232],
  [9,8,3,4.239],
  [9,9,2,4.245],
  [9,10,1,4.251],
  [10,5,5,4.755],
  [10,6,4,4.762],
  [10,7,3,4.77],
  [10,8,2,4.776],
  [10,9,1,4.783],
  [10,10,0,4.789]
];
const averages = new Map(STAT_FD_ROWS.map(([primary, high, low, fd]) => [`${primary}/${high}/${low}`, fd]));

export function validateStatLines(lines) {
  if (!Array.isArray(lines) || lines.length !== 3) return { valid: false, error: 'Enter three line levels.' };
  const entered = lines.filter(value => value !== null);
  if (entered.some(value => !Number.isInteger(value) || value < 0 || value > 10)) {
    return { valid: false, error: 'Each line must be a whole number from 0 to 10.' };
  }
  const total = entered.reduce((sum, value) => sum + value, 0);
  if (total > 20) return { valid: false, error: 'The combined level cannot exceed 20.' };
  return { valid: true, complete: entered.length === 3, total };
}

export function statProgress(lines, legacyTotal = 0, markedComplete = false) {
  const checked = validateStatLines(lines);
  const total = markedComplete ? 20 : checked.valid && checked.complete ? checked.total : legacyTotal;
  let fd = null;
  if (checked.valid && checked.complete && checked.total === 20) {
    const [primary, second, third] = lines;
    fd = averages.get(`${primary}/${Math.max(second, third)}/${Math.min(second, third)}`) ?? null;
  }
  return { total, fd, hasLines: checked.valid && checked.complete };
}

// Keep entered order and partial details. Never infer a split from a legacy total.
export function restoreStatLines(lines, legacyTotal = 0) {
  if (validateStatLines(lines).valid) return [...lines];
  return legacyTotal > 0 ? [null, null, null] : [0, 0, 0];
}
