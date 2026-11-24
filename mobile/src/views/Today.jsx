import React, {useEffect, useState} from "react";
import {Card, Empty, Icon, KindPill, TagText} from "../ui.jsx";
import {getDay, addLog, removeLog, setMood, setEnergy, toggleHabit, toggleTask, sessionsOn, sortedTasks, MOODS, parseLog} from "../../../src/lib/model.js";
import {clock, fmtMinutes} from "../../../src/lib/dates.js";
import {promptFor} from "../../../src/lib/prompts.js";
import {githubPushesOn} from "../github.js";
import {sampleState} from "../store.js";

const KINDS = ["note", "win", "til", "blocker", "bug", "idea"];
const PLACEHOLDER = {
  note: "What are you working on?", win: "What did you ship or fix?", til: "What did you learn?",
  blocker: "What's in your way?", bug: "What broke?", idea: "What should future-you try?",
};

function Welcome({update}) {
  return (
    <Card className="welcome">
      <h1>Your dev diary</h1>
      <p>Log what you ship and learn, write a short entry each day, run focus blocks and keep your habits going. Everything stays on this device.</p>
      <div className="row gap">
        <button className="btn primary" onClick={() => update((s) => ({...s, settings: {...s.settings, onboarded: true}}))}>Start fresh</button>
        <button className="btn" onClick={() => update((s) => sampleState(s))}>Explore with sample data</button>
      </div>
      <p className="hint">Sample entries end in “(sample)”. You can erase them later in Settings.</p>
    </Card>
  );
}

function GitHubCard({user, today, openSettings}) {
  const [st, setSt] = useState({loading: !!user, list: [], error: null});
  useEffect(() => {
    if (!user) return;
    let live = true;
    setSt((s) => ({...s, loading: true, error: null}));
    githubPushesOn(user, today)
      .then((list) => live && setSt({loading: false, list, error: null}))
      .catch((e) => live && setSt({loading: false, list: [], error: e.message === "Failed to fetch" ? "Couldn't reach GitHub." : e.message}));
    return () => { live = false; };
  }, [user, today]);

  if (!user) return (
    <Card title="Commits today">
      <Empty>Add your GitHub username to see today's public pushes here.</Empty>
      <button className="btn small" onClick={openSettings}><Icon name="git" size={16} /> Connect GitHub</button>
    </Card>
  );
  return (
    <Card title="Commits today" action={<span className="muted mono">@{user}</span>}>
      {st.loading ? <Empty>Checking GitHub…</Empty>
        : st.error ? <Empty>{st.error}</Empty>
        : st.list.length === 0 ? <Empty>No public pushes yet today.</Empty>
        : <ul className="list">{st.list.map((c, i) => (
          <li key={i} className="commit"><span className="mono muted">{c.time}</span><span className="mono hash">{c.hash}</span>
            <span className="grow">{c.subject}</span><span className="muted small">{c.repo}</span></li>))}</ul>}
    </Card>
  );
}

export default function Today({state, update, say, timer, today, setTab, setOpenDay, openSettings}) {
  const day = getDay(state, today);
  const [kind, setKind] = useState("note");
  const [text, setText] = useState("");
  const sessions = sessionsOn(state, today);
  const focusMin = sessions.reduce((a, x) => a + x.minutes, 0);
  const goal = state.settings.work * 8;
  const open = sortedTasks(state.tasks).filter((t) => !t.done).slice(0, 3);
  const hasEntry = !!state.journal[today];

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const parsed = parseLog(text);
    const raw = parsed.kind !== "note" || kind === "note" ? text : `${kind}: ${text}`;
    update((s) => addLog(s, raw, today));
    setText("");
  };
  const remove = (i) => {
    const removed = day.logs[i];
    update((s) => removeLog(s, today, i));
    say("Log removed", {label: "Undo", run: () => update((s) => {
      const d = getDay(s, today);
      const logs = [...d.logs]; logs.splice(i, 0, removed);
      return {...s, days: {...s.days, [today]: {...d, logs}}};
    })});
  };

  return (
    <div className="stack">
      {!state.settings.onboarded && <Welcome update={update} />}

      <Card title="How's today going?">
        <div className="mood-row" role="radiogroup" aria-label="Mood">
          {MOODS.map((m, i) => (
            <button key={m.label} role="radio" aria-checked={day.mood === i + 1}
              className={`mood ${day.mood === i + 1 ? "on" : ""}`}
              onClick={() => update((s) => setMood(s, today, day.mood === i + 1 ? null : i + 1))}>
              <span className="emoji">{m.emoji}</span><span>{m.label}</span>
            </button>
          ))}
        </div>
        <div className="energy">
          <span className="label">Energy</span>
          <div className="segments" role="radiogroup" aria-label="Energy">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={day.energy === n} aria-label={`Energy ${n} of 5`}
                className={day.energy >= n ? "on" : ""}
                onClick={() => update((s) => setEnergy(s, today, day.energy === n ? null : n))} />
            ))}
          </div>
          <span className="mono muted">{day.energy ? `${day.energy}/5` : "–"}</span>
        </div>
      </Card>

      <Card className="prompt-card">
        <p className="prompt">{promptFor(today)}</p>
        <button className="btn" onClick={() => { setOpenDay(today); setTab("journal"); }}>
          {hasEntry ? "Continue today's entry" : "Write today's entry"}
        </button>
      </Card>

      <Card title="Log" action={<span className="muted mono">{day.logs.length} today</span>}>
        <div className="kinds" role="radiogroup" aria-label="Log type">
          {KINDS.map((k) => (
            <button key={k} role="radio" aria-checked={kind === k} className={`pill kind-${k} ${kind === k ? "on" : "off"}`} onClick={() => setKind(k)}>
              {k === "til" ? "TIL" : k}
            </button>
          ))}
        </div>
        <form className="add-row" onSubmit={submit}>
          <input id="log-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER[kind]} autoComplete="off" enterKeyHint="send" />
          <button className="btn primary icon" aria-label="Add log"><Icon name="plus" /></button>
        </form>
        {day.logs.length === 0
          ? <Empty>Nothing logged yet. Tip: typing “til: …” or “blocker: …” also sets the type.</Empty>
          : <ul className="list logs">{day.logs.map((l, i) => (
            <li key={l.t + i}>
              <span className="mono muted time">{clock(new Date(l.t))}</span>
              <KindPill kind={l.kind} />
              <span className="grow">{l.text}</span>
              <button className="icon-btn subtle" aria-label="Remove log" onClick={() => remove(i)}><Icon name="x" size={16} /></button>
            </li>)).reverse()}</ul>}
      </Card>

      <Card title="Focus" action={<span className="muted mono">{sessions.length} blocks</span>}>
        <div className="focus-sum">
          <div><span className="big mono">{fmtMinutes(focusMin)}</span> <span className="muted">of {fmtMinutes(goal)}</span></div>
          <button className="btn primary small" onClick={() => { if (!timer.running) timer.toggle(); setTab("focus"); }}>
            <Icon name="play" size={14} fill /> {timer.running ? "Running" : "Start a block"}
          </button>
        </div>
        <div className="meter"><span style={{width: `${Math.min(100, (focusMin / goal) * 100)}%`}} /></div>
      </Card>

      <Card title="Habits" action={<span className="muted mono">{state.habits.filter((h) => day.habits[h.id]).length}/{state.habits.length}</span>}>
        <ul className="habits">
          {state.habits.map((h) => (
            <li key={h.id}>
              <button className={`check-row ${day.habits[h.id] ? "on" : ""}`} aria-pressed={!!day.habits[h.id]}
                onClick={() => update((s) => toggleHabit(s, today, h.id))}>
                <span className="box">{day.habits[h.id] && <Icon name="check" size={14} />}</span>{h.name}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Up next" action={<button className="link" onClick={() => setTab("tasks")}>All tasks</button>}>
        {open.length === 0 ? <Empty>No open tasks.</Empty> : (
          <ul className="list">{open.map((t) => (
            <li key={t.id}>
              <button className="box-btn" aria-label={`Complete ${t.text}`} onClick={() => update((s) => toggleTask(s, t.id))}><span className="box" /></button>
              {t.priority > 0 && <span className={`prio p${t.priority}`}>{"!".repeat(t.priority)}</span>}
              <span className="grow"><TagText text={t.text} /></span>
            </li>))}</ul>
        )}
      </Card>

      <GitHubCard user={state.settings.githubUser} today={today} openSettings={openSettings} />
    </div>
  );
}
