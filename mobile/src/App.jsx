import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAppState} from "./store.js";
import {useTimer} from "./useTimer.js";
import {isNative} from "./native.js";
import {Icon} from "./ui.jsx";
import {addSession, activeDays, currentStreak} from "../../src/lib/model.js";
import {dayKey, fmtMinutes, prettyDate} from "../../src/lib/dates.js";
import Today from "./views/Today.jsx";
import Journal from "./views/Journal.jsx";
import Focus, {fmtTimer} from "./views/Focus.jsx";
import Tasks from "./views/Tasks.jsx";
import Insights from "./views/Insights.jsx";
import Settings from "./views/Settings.jsx";

const TABS = [
  {key: "today", label: "Today", icon: "today", View: Today},
  {key: "journal", label: "Journal", icon: "journal", View: Journal},
  {key: "focus", label: "Focus", icon: "focus", View: Focus},
  {key: "tasks", label: "Tasks", icon: "tasks", View: Tasks},
  {key: "insights", label: "Insights", icon: "insights", View: Insights},
];

const readTab = () => { try { return localStorage.getItem("devlog-tab") || "today"; } catch { return "today"; } };

function useToday() {
  const [k, setK] = useState(dayKey());
  useEffect(() => {
    const tick = () => setK(dayKey());
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return k;
}

export default function App() {
  const {state, update} = useAppState();
  const today = useToday();
  const [tab, setTabState] = useState(readTab);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openDay, setOpenDay] = useState(null); // journal entry being edited
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const setTab = useCallback((k) => {
    setTabState(k);
    try { localStorage.setItem("devlog-tab", k); } catch { /* ignore */ }
    window.scrollTo({top: 0});
  }, []);

  const say = useCallback((text, action) => {
    clearTimeout(toastTimer.current);
    setToast({text, action, id: Date.now()});
    toastTimer.current = setTimeout(() => setToast(null), action ? 5000 : 2600);
  }, []);

  const timer = useTimer(state.settings, (sess) => {
    update((s) => addSession(s, sess));
    say(`Logged ${fmtMinutes(sess.minutes)} of focus${sess.task ? ` on ${sess.task}` : ""}`);
  });

  useEffect(() => {
    const a = state.settings.appearance;
    if (a === "light" || a === "dark") document.documentElement.dataset.theme = a;
    else delete document.documentElement.dataset.theme;
  }, [state.settings.appearance]);

  // Android back button: close the sheet / entry first, then go to Today, then exit.
  const backRef = useRef(null);
  backRef.current = () => {
    if (settingsOpen) return setSettingsOpen(false), true;
    if (openDay) return setOpenDay(null), true;
    if (tab !== "today") return setTab("today"), true;
    return false;
  };
  useEffect(() => {
    if (!isNative) return;
    let handle;
    import("@capacitor/app").then(({App: CapApp}) =>
      CapApp.addListener("backButton", () => { if (!backRef.current()) CapApp.exitApp(); }).then((h) => { handle = h; }));
    return () => handle?.remove();
  }, []);

  const streak = currentStreak(activeDays(state, Object.keys(state.journal)), today);
  const {View} = TABS.find((t) => t.key === tab) || TABS[0];
  const showTimerChip = tab !== "focus" && (timer.running || timer.startedAt);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="logo" aria-hidden="true">{">_"}</span>
            <div>
              <div className="brand-name">devlog</div>
              <div className="brand-date">{prettyDate(today, {year: "numeric"})}</div>
            </div>
          </div>
          <div className="topbar-actions">
            {showTimerChip && (
              <button className={`chip timer-chip ${timer.phase !== "WORK" ? "is-break" : ""}`} onClick={() => setTab("focus")}>
                <Icon name={timer.running ? "play" : "pause"} size={14} fill={timer.running} />
                <span className="mono">{fmtTimer(timer.remaining)}</span>
              </button>
            )}
            <span className="chip streak" title="Days in a row with any entry">
              <Icon name="flame" size={14} /> <span className="mono">{streak}</span>
            </span>
            <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <Icon name="gear" />
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        <View state={state} update={update} say={say} timer={timer} today={today}
          setTab={setTab} openDay={openDay} setOpenDay={setOpenDay}
          openSettings={() => setSettingsOpen(true)} />
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === tab ? "active" : ""} aria-current={t.key === tab ? "page" : undefined}
            onClick={() => { setTab(t.key); if (t.key === "journal") setOpenDay(null); }}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {settingsOpen && <Settings state={state} update={update} say={say} today={today} onClose={() => setSettingsOpen(false)} />}

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.text}</span>
          {toast.action && <button onClick={() => { toast.action.run(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
    </div>
  );
}
