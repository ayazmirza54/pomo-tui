import {useCallback, useRef, useState} from "react";
import {emptyState, migrate, addLog, addTask, setMood, setEnergy, toggleHabit, addSession, toggleTask} from "../../src/lib/model.js";
import {dayKey, addDays} from "../../src/lib/dates.js";

const KEY = "devlog-state-v1";

export const MOBILE_DEFAULTS = {appearance: "system", githubUser: "", onboarded: false};

export const normalize = (s) => ({
  ...s,
  journal: s.journal || {},
  settings: {...MOBILE_DEFAULTS, ...s.settings},
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(migrate(JSON.parse(raw)));
  } catch { /* storage unavailable: start fresh */ }
  return normalize(emptyState());
}

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function useAppState() {
  const ref = useRef(null);
  if (ref.current === null) ref.current = loadState();
  const [state, setState] = useState(ref.current);
  const update = useCallback((fn) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    persist(next);
    setState(next);
  }, []);
  return {state, update};
}

/** Accepts a devlog backup from this app or the terminal app's data.json. */
export function importBackup(current, text) {
  const raw = JSON.parse(text);
  if (!raw || typeof raw !== "object" || !raw.days) throw new Error("That file isn't a devlog backup.");
  const s = normalize(migrate(raw));
  return {...s, settings: {...s.settings, onboarded: true, appearance: current.settings.appearance}};
}

/** Example data for the first-run tour. Every entry is clearly labelled as a sample. */
export function sampleState(base) {
  let s = {...base, settings: {...base.settings, onboarded: true}};
  const today = dayKey();
  const at = (k, h, m = 0) => { const d = new Date(`${k}T00:00:00`); d.setHours(h, m); return d.getTime(); };
  const notes = [
    ["win: merged the auth refactor (sample)", "til: git worktree lets you check out two branches at once (sample)", "blocker: e2e suite flaky on CI (sample)"],
    ["bug: off-by-one in pagination cursor (sample)", "idea: cache the schema in a build step (sample)"],
    ["win: shipped the settings page (sample)", "til: CSS :has() works in every evergreen browser (sample)"],
  ];
  for (let i = 0; i < 70; i++) {
    const k = addDays(today, -i);
    const busy = (i * 7) % 5 !== 0;
    if (!busy && i > 0) continue;
    if (i < 21) { s = setMood(s, k, 2 + ((i * 3) % 4)); s = setEnergy(s, k, 2 + ((i * 2) % 4)); }
    if (i < 3) notes[i].forEach((n, j) => { s = addLog(s, n, k, at(k, 10 + j * 2)); });
    const blocks = 1 + ((i * 5) % 4);
    for (let b = 0; b < blocks && i > 0; b++)
      s = addSession(s, {start: at(k, 9 + b), end: at(k, 9 + b, 25), minutes: 25 + (b % 2) * 25,
        task: ["auth refactor", "API pagination", "code review", "docs"][(i + b) % 4]});
    s.habits.forEach((h, j) => { if ((i + j) % 3 !== 0 && i < 30) s = toggleHabit(s, k, h.id); });
  }
  s = addTask(s, "!!! fix login redirect loop #auth (sample)");
  s = addTask(s, "!! write ADR for the job queue #arch (sample)");
  s = addTask(s, "bump Node to 22 (sample)");
  s = addTask(s, "reply to review comments (sample)");
  s = toggleTask(s, s.tasks[3].id);
  s = {...s, journal: {...s.journal, [addDays(today, -1)]:
    "# Sample entry\n\n## Shipped\n- Settings page behind a flag\n\n## Blockers\n- Waiting on design for the empty states\n\n## TIL\n- `git worktree add ../hotfix main`\n\n## Tomorrow\n- Pair with Sam on the queue ADR\n"}};
  return s;
}
