// Pure state helpers. Every mutator returns a new state object.
import {dayKey, addDays} from "./dates.js";

export const MOODS = [
  {emoji: "😫", label: "rough"},
  {emoji: "😕", label: "meh"},
  {emoji: "😐", label: "okay"},
  {emoji: "🙂", label: "good"},
  {emoji: "🤩", label: "great"},
];
export const moodEmoji = (m) => (m ? MOODS[m - 1].emoji : "·");

export const LOG_KINDS = {
  note:    {icon: "•",  label: "note"},
  win:     {icon: "🏆", label: "win"},
  til:     {icon: "💡", label: "TIL"},
  blocker: {icon: "🧱", label: "blocker"},
  bug:     {icon: "🐛", label: "bug"},
  idea:    {icon: "✨", label: "idea"},
};
const KIND_ALIASES = {til: "til", learned: "til", win: "win", shipped: "win", ship: "win",
  blocker: "blocker", blocked: "blocker", block: "blocker", bug: "bug", idea: "idea", note: "note"};

export const DEFAULT_HABITS = [
  "Ship a commit",
  "Review a PR",
  "Learn something (30m)",
  "Deep-work block",
  "Move / exercise",
];

export const DEFAULT_SETTINGS = {
  theme: 0,
  work: 25, short: 5, long: 15, rounds: 4,
  repos: [],        // git repos scanned for "commits today"
  gitAuthor: "",    // empty = git config user.email
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const emptyState = () => ({
  version: 1,
  settings: {...DEFAULT_SETTINGS},
  habits: DEFAULT_HABITS.map((name, i) => ({id: `h${i}`, name})),
  days: {},
  sessions: [],
  tasks: [],
});

export const migrate = (raw) => {
  const base = emptyState();
  return {
    ...base,
    ...raw,
    settings: {...base.settings, ...(raw.settings || {})},
    habits: Array.isArray(raw.habits) ? raw.habits : base.habits,
    days: raw.days || {},
    sessions: raw.sessions || [],
    tasks: raw.tasks || [],
  };
};

/* ───────── days / logs ───────── */
export const getDay = (s, k) => s.days[k] || {mood: null, energy: null, logs: [], habits: {}};
const setDay = (s, k, fn) => ({...s, days: {...s.days, [k]: fn(getDay(s, k))}});

/** "til: foo" → {kind:"til", text:"foo"} */
export const parseLog = (raw) => {
  const text = raw.trim();
  const m = text.match(/^([a-z]+)\s*[:!]\s*(.*)$/i);
  if (m && KIND_ALIASES[m[1].toLowerCase()] && m[2].trim())
    return {kind: KIND_ALIASES[m[1].toLowerCase()], text: m[2].trim()};
  return {kind: "note", text};
};

export const addLog = (s, raw, k = dayKey(), t = Date.now()) =>
  setDay(s, k, (d) => ({...d, logs: [...d.logs, {t, ...parseLog(raw)}]}));

export const removeLog = (s, k, idx) =>
  setDay(s, k, (d) => ({...d, logs: d.logs.filter((_, i) => i !== idx)}));

const clamp15 = (v) => (v == null ? null : Math.min(5, Math.max(1, Math.round(v))));
export const setMood = (s, k, v) => setDay(s, k, (d) => ({...d, mood: clamp15(v)}));
export const setEnergy = (s, k, v) => setDay(s, k, (d) => ({...d, energy: clamp15(v)}));

/* ───────── habits ───────── */
export const toggleHabit = (s, k, id) =>
  setDay(s, k, (d) => ({...d, habits: {...d.habits, [id]: !d.habits[id]}}));
export const addHabit = (s, name) => ({...s, habits: [...s.habits, {id: uid(), name: name.trim()}]});
export const removeHabit = (s, id) => ({...s, habits: s.habits.filter((h) => h.id !== id)});
export const habitDays = (s, id) =>
  new Set(Object.entries(s.days).filter(([, d]) => d.habits?.[id]).map(([k]) => k));

/* ───────── tasks ───────── */
/** Leading "!", "!!", "!!!" sets priority 1-3. */
export const parseTask = (raw) => {
  const m = raw.trim().match(/^(!{1,3})\s*(.*)$/);
  return m ? {priority: m[1].length, text: m[2].trim()} : {priority: 0, text: raw.trim()};
};
export const addTask = (s, raw, now = Date.now()) => {
  const {priority, text} = parseTask(raw);
  if (!text) return s;
  return {...s, tasks: [...s.tasks, {id: uid(), text, priority, done: false, created: now, doneAt: null}]};
};
const patchTask = (s, id, fn) => ({...s, tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t))});
export const toggleTask = (s, id, now = Date.now()) =>
  patchTask(s, id, (t) => ({...t, done: !t.done, doneAt: t.done ? null : now}));
export const cyclePriority = (s, id) => patchTask(s, id, (t) => ({...t, priority: ((t.priority || 0) + 1) % 4}));
export const removeTask = (s, id) => ({...s, tasks: s.tasks.filter((t) => t.id !== id)});
export const sortedTasks = (tasks) =>
  [...tasks].sort((a, b) =>
    (a.done - b.done) ||
    (a.done ? (b.doneAt || 0) - (a.doneAt || 0) : (b.priority - a.priority) || (a.created - b.created)));
export const tagsOf = (text) => text.match(/#[\w-]+/g) || [];

/* ───────── focus sessions ───────── */
export const addSession = (s, {start, end, minutes, task}) =>
  ({...s, sessions: [...s.sessions, {id: uid(), start, end, minutes: Math.round(minutes), task: task || ""}]});

export const sessionsOn = (s, k) => s.sessions.filter((x) => dayKey(new Date(x.start)) === k);

export const focusByDay = (s) => {
  const out = {};
  for (const x of s.sessions) {
    const k = dayKey(new Date(x.start));
    out[k] = (out[k] || 0) + x.minutes;
  }
  return out;
};

/* ───────── streaks ───────── */
export const dayHasActivity = (d) =>
  !!d && (d.logs?.length > 0 || d.mood != null || d.energy != null || Object.values(d.habits || {}).some(Boolean));

/** Days with any journalling activity (logs, mood, habits, focus, or journal files). */
export const activeDays = (s, journalKeys = []) => {
  const set = new Set(journalKeys);
  for (const [k, d] of Object.entries(s.days)) if (dayHasActivity(d)) set.add(k);
  for (const x of s.sessions) set.add(dayKey(new Date(x.start)));
  return set;
};

/** Consecutive days ending today (or yesterday, if today isn't done yet). */
export const currentStreak = (set, today = dayKey()) => {
  let k = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(k)) { n++; k = addDays(k, -1); }
  return n;
};

export const longestStreak = (set) => {
  const keys = [...set].sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) {
    cur = prev && addDays(prev, 1) === k ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = k;
  }
  return best;
};
