export const pad = (n) => String(n).padStart(2, "0");

/** Local-time day key, e.g. "2026-11-24". */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const isDayKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);

export const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

/** The n day keys ending at `end` (inclusive), oldest first. */
export const lastNDays = (n, end = dayKey()) =>
  Array.from({length: n}, (_, i) => addDays(end, i - n + 1));

export const prettyDate = (k, opts = {}) =>
  parseKey(k).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", ...opts,
  });

export const clock = (d = new Date()) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const fmtMinutes = (m) => {
  m = Math.round(m);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

/** Monday-based weekday index: Mon=0 … Sun=6 */
export const weekdayIdx = (k) => (parseKey(k).getDay() + 6) % 7;
