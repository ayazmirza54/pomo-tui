import {addDays, weekdayIdx, parseKey} from "./dates.js";

export const SHADES = ["·", "░", "▒", "▓", "█"];
export const level = (m) => (!m ? 0 : m < 25 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4);

/** GitHub-style grid: 7 rows (Mon..Sun) × `weeks` columns ending this week. */
export function heatmap(byDay, weeks, today) {
  const start = addDays(today, -weekdayIdx(today) - (weeks - 1) * 7);
  const grid = Array.from({length: 7}, (_, r) =>
    Array.from({length: weeks}, (_, c) => {
      const k = addDays(start, c * 7 + r);
      return k > today ? null : level(byDay[k] || 0);
    }));
  const months = Array(weeks * 2).fill(" ");
  let prevMonth = -1;
  for (let c = 0; c < weeks; c++) {
    const m = parseKey(addDays(start, c * 7)).getMonth();
    if (m !== prevMonth && c * 2 + 3 <= months.length) {
      [..."JanFebMarAprMayJunJulAugSepOctNovDec".slice(m * 3, m * 3 + 3)].forEach((ch, i) => { months[c * 2 + i] = ch; });
      prevMonth = m;
    }
  }
  return {grid, months: months.join("")};
}
