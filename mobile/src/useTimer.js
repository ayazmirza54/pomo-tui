import {useCallback, useEffect, useRef, useState} from "react";
import {scheduleTimerAlert, cancelTimerAlert, buzz} from "./native.js";

const KEY = "devlog-timer-v1";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = (t) => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* ignore */ } };

/** Wall-clock pomodoro that survives the app being closed and reopened. */
export function useTimer(settings, onWorkDone) {
  const lenOf = useCallback((p) => (p === "WORK" ? settings.work : p === "SHORT" ? settings.short : settings.long) * 60_000,
    [settings.work, settings.short, settings.long]);
  const fresh = () => ({phase: "WORK", round: 1, running: false, phaseLen: lenOf("WORK"), remaining: lenOf("WORK"), endAt: 0, startedAt: null, task: ""});
  const [t, setT] = useState(() => read() || fresh());
  const [now, setNow] = useState(Date.now());
  const cb = useRef(onWorkDone);
  cb.current = onWorkDone;

  useEffect(() => write(t), [t]);

  // When lengths change in settings, refresh an idle timer.
  useEffect(() => {
    setT((p) => (!p.running && !p.startedAt ? {...p, phaseLen: lenOf(p.phase), remaining: lenOf(p.phase)} : p));
  }, [lenOf]);

  useEffect(() => {
    if (!t.running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    const vis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [t.running]);

  const remaining = t.running ? Math.max(0, t.endAt - now) : t.remaining;

  const advance = useCallback((p, logIt) => {
    const at = Date.now();
    const rem = p.running ? Math.max(0, p.endAt - at) : p.remaining;
    const minutes = (p.phaseLen - rem) / 60_000;
    if (p.phase === "WORK" && logIt && minutes >= 1)
      cb.current({start: p.startedAt || at - minutes * 60_000, end: Math.min(at, p.endAt || at), minutes, task: p.task});
    const next = p.phase === "WORK" ? (p.round % settings.rounds === 0 ? "LONG" : "SHORT") : "WORK";
    return {...p, phase: next, round: p.phase === "WORK" ? p.round : p.round + 1, running: false,
      phaseLen: lenOf(next), remaining: lenOf(next), startedAt: null, endAt: 0};
  }, [lenOf, settings.rounds]);

  useEffect(() => {
    if (t.running && remaining <= 0) { buzz([200, 100, 200]); setT((p) => advance(p, true)); }
  }, [remaining, t.running, advance]);

  return {
    ...t, remaining, elapsed: t.phaseLen - remaining,
    toggle() {
      setT((p) => {
        const at = Date.now();
        if (p.running) { cancelTimerAlert(); return {...p, running: false, remaining: Math.max(0, p.endAt - at)}; }
        const endAt = at + p.remaining;
        scheduleTimerAlert(endAt, p.phase === "WORK" ? "Focus block done" : "Break's over",
          p.phase === "WORK" ? `${p.task || "Nice work"}. Take a break.` : "Time for the next focus block.");
        return {...p, running: true, endAt, startedAt: p.startedAt ?? at};
      });
    },
    finish() { cancelTimerAlert(); setT((p) => advance(p, true)); },
    skip() { cancelTimerAlert(); setT((p) => advance(p, false)); },
    reset() { cancelTimerAlert(); setT((p) => ({...fresh(), task: p.task})); },
    adjust(min) {
      setT((p) => {
        const d = min * 60_000;
        const rem = p.running ? p.endAt - Date.now() : p.remaining;
        if (rem + d < 60_000) return p;
        const n = {...p, phaseLen: p.phaseLen + d, remaining: rem + d, endAt: p.running ? p.endAt + d : 0};
        if (p.running) scheduleTimerAlert(n.endAt, "Focus block done", n.task || "Take a break.");
        return n;
      });
    },
    setTask(task) { setT((p) => ({...p, task})); },
  };
}
