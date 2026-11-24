import {useCallback, useEffect, useRef, useState} from "react";
import {useStdout} from "ink";
import {spawn} from "node:child_process";
import {load, save, mtime} from "../lib/store.js";

export function useSize() {
  const {stdout} = useStdout();
  const get = () => ({cols: stdout.columns || 80, rows: stdout.rows || 24});
  const [size, setSize] = useState(get);
  useEffect(() => {
    const on = () => setSize(get());
    stdout.on("resize", on);
    return () => { stdout.off("resize", on); };
  }, [stdout]); // eslint-disable-line
  return size;
}

/** App state backed by data.json; picks up writes from other processes (e.g. `devlog log`). */
export function useStore() {
  const ref = useRef(null);
  if (ref.current === null) ref.current = load();
  const [state, setState] = useState(ref.current);
  const ours = useRef(mtime());

  const update = useCallback((fn) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    ours.current = save(next);
    setState(next);
  }, []);

  const reload = useCallback(() => {
    try {
      ref.current = load();
      ours.current = mtime();
      setState(ref.current);
    } catch { /* keep current state if the file is mid-write or broken */ }
  }, []);

  useEffect(() => {
    const id = setInterval(() => { if (mtime() !== ours.current) reload(); }, 1000);
    return () => clearInterval(id);
  }, [reload]);

  return {state, update, reload};
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

export function notify(title, body) {
  process.stdout.write("\x07");
  const cmd = process.platform === "darwin"
    ? ["osascript", ["-e", `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`]]
    : process.platform === "linux" ? ["notify-send", [title, body]] : null;
  if (!cmd) return;
  try { spawn(cmd[0], cmd[1], {stdio: "ignore", detached: true}).on("error", () => {}).unref(); } catch { /* optional */ }
}

/**
 * Pomodoro engine (wall-clock based so it doesn't drift).
 * onWorkDone({start, end, minutes, task}) fires when a work block finishes (or is finished early).
 */
export function useFocusTimer(settings, onWorkDone) {
  const lenOf = (phase) => (phase === "WORK" ? settings.work : phase === "SHORT" ? settings.short : settings.long) * 60_000;
  const [t, setT] = useState(() => ({
    phase: "WORK", round: 1, running: false,
    phaseLen: lenOf("WORK"), remaining: lenOf("WORK"), endAt: 0, startedAt: null, task: "",
  }));
  const cb = useRef(onWorkDone);
  cb.current = onWorkDone;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!t.running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [t.running]);

  const remaining = t.running ? Math.max(0, t.endAt - now) : t.remaining;
  const elapsed = t.phaseLen - remaining;

  const advance = useCallback((prev, logIt) => {
    const at = Date.now();
    const rem = prev.running ? Math.max(0, prev.endAt - at) : prev.remaining;
    const minutes = (prev.phaseLen - rem) / 60_000;
    if (prev.phase === "WORK" && logIt && minutes >= 1)
      cb.current({start: prev.startedAt || at - minutes * 60_000, end: at, minutes, task: prev.task});
    const nextPhase = prev.phase === "WORK" ? (prev.round % settings.rounds === 0 ? "LONG" : "SHORT") : "WORK";
    const round = prev.phase === "WORK" ? prev.round : prev.round + 1;
    const len = lenOf(nextPhase);
    return {...prev, phase: nextPhase, round, running: false, phaseLen: len, remaining: len, startedAt: null};
  }, [settings.rounds, settings.work, settings.short, settings.long]); // eslint-disable-line

  useEffect(() => {
    if (t.running && remaining <= 0) {
      notify("devlog", t.phase === "WORK" ? "Focus block done — take a break ☕" : "Break over — back to it 🍅");
      setT((p) => advance(p, true));
    }
  }, [remaining, t.running]); // eslint-disable-line

  const api = {
    ...t, remaining, elapsed,
    toggle: () => setT((p) => {
      const at = Date.now();
      return p.running
        ? {...p, running: false, remaining: Math.max(0, p.endAt - at)}
        : {...p, running: true, endAt: at + p.remaining, startedAt: p.startedAt ?? at};
    }),
    reset: () => setT((p) => ({...p, phase: "WORK", round: 1, running: false,
      phaseLen: lenOf("WORK"), remaining: lenOf("WORK"), startedAt: null})),
    skip: () => setT((p) => advance(p, false)),
    finish: () => setT((p) => advance(p, true)),
    adjust: (deltaMin) => setT((p) => {
      const d = deltaMin * 60_000;
      const rem = p.running ? p.endAt - Date.now() : p.remaining;
      if (rem + d < 60_000) return p;
      return {...p, phaseLen: p.phaseLen + d, remaining: rem + d, endAt: p.endAt + d};
    }),
    setTask: (task) => setT((p) => ({...p, task})),
    /** Called on quit: log a partial work block so nothing is lost. */
    flush: () => {
      if (t.phase === "WORK" && t.startedAt && elapsed >= 60_000)
        cb.current({start: t.startedAt, end: Date.now(), minutes: elapsed / 60_000, task: t.task});
    },
  };
  return api;
}
