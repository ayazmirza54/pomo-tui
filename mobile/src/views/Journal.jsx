import React, {useMemo, useState} from "react";
import {Card, Empty, Icon, KindPill} from "../ui.jsx";
import {Markdown} from "../markdown.jsx";
import {getDay, dayHasActivity, sessionsOn, MOODS, moodEmoji} from "../../../src/lib/model.js";
import {prettyDate, clock, fmtMinutes} from "../../../src/lib/dates.js";
import {template} from "../../../src/lib/prompts.js";

const snippet = (md) => (md || "").split("\n").map((l) => l.trim())
  .find((l) => l && !l.startsWith("#") && !l.startsWith(">")) ?.replace(/^[-*]\s(\[.\]\s)?/, "") || "";

function Entry({state, update, k, onBack}) {
  const saved = state.journal[k];
  const [mode, setMode] = useState(saved ? "read" : "write");
  const value = saved ?? template(k);
  const d = getDay(state, k);
  const mins = sessionsOn(state, k).reduce((a, x) => a + x.minutes, 0);
  const save = (text) => update((s) => ({...s, journal: {...s.journal, [k]: text}}));

  return (
    <div className="stack">
      <div className="entry-head">
        <button className="icon-btn" aria-label="Back to entries" onClick={onBack}><Icon name="back" /></button>
        <div className="grow">
          <h1 className="entry-title">{prettyDate(k, {year: "numeric", month: "long"})}</h1>
          <div className="muted small">
            {[d.mood && `${MOODS[d.mood - 1].emoji} ${MOODS[d.mood - 1].label}`, d.energy && `energy ${d.energy}/5`, mins && `${fmtMinutes(mins)} focus`].filter(Boolean).join(" · ") || "No mood logged"}
          </div>
        </div>
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={mode === "write"} className={mode === "write" ? "on" : ""} onClick={() => setMode("write")}>Write</button>
          <button role="tab" aria-selected={mode === "read"} className={mode === "read" ? "on" : ""} onClick={() => setMode("read")}>Read</button>
        </div>
      </div>

      {d.logs.length > 0 && (
        <Card title="Logged that day">
          <ul className="list logs">{d.logs.map((l, i) => (
            <li key={i}><span className="mono muted time">{clock(new Date(l.t))}</span><KindPill kind={l.kind} /><span className="grow">{l.text}</span></li>))}</ul>
        </Card>
      )}

      {mode === "write" ? (
        <textarea id={`entry-${k}`} className="editor" value={value} spellCheck
          onChange={(e) => save(e.target.value)} aria-label="Journal entry (Markdown)" />
      ) : (
        <Card>{saved ? <Markdown source={saved} /> : <Empty>Nothing written yet. Switch to Write to start from the template.</Empty>}</Card>
      )}
      {mode === "write" && <p className="hint">Markdown. Saved as you type.</p>}
      {saved !== undefined && (
        <button className="btn danger-quiet small" onClick={() => { update((s) => { const j = {...s.journal}; delete j[k]; return {...s, journal: j}; }); onBack(); }}>
          Delete this entry
        </button>
      )}
    </div>
  );
}

export default function Journal({state, update, today, openDay, setOpenDay}) {
  const [q, setQ] = useState("");
  const days = useMemo(() => {
    const set = new Set([today, ...Object.keys(state.journal)]);
    for (const [k, d] of Object.entries(state.days)) if (dayHasActivity(d)) set.add(k);
    return [...set].sort().reverse();
  }, [state, today]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return days;
    return days.filter((k) => (state.journal[k] || "").toLowerCase().includes(needle) ||
      getDay(state, k).logs.some((l) => l.text.toLowerCase().includes(needle)));
  }, [days, q, state]);

  if (openDay) return <Entry key={openDay} state={state} update={update} k={openDay} onBack={() => setOpenDay(null)} />;

  return (
    <div className="stack">
      <label className="search">
        <Icon name="search" size={18} />
        <input id="journal-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entries and logs" />
      </label>
      {shown.length === 0 && <Empty>No entries match “{q}”.</Empty>}
      <ul className="entries">
        {shown.map((k) => {
          const d = getDay(state, k);
          const text = snippet(state.journal[k]) || d.logs.at(-1)?.text || (k === today ? "Tap to write today's entry." : "");
          return (
            <li key={k}>
              <button className="entry-row" onClick={() => setOpenDay(k)}>
                <span className="entry-mood" aria-hidden="true">{moodEmoji(d.mood)}</span>
                <span className="grow">
                  <span className="entry-date">{k === today ? "Today" : prettyDate(k, {year: "numeric"})}</span>
                  <span className="entry-snippet">{text}</span>
                </span>
                <span className="entry-meta mono">
                  {state.journal[k] && <span className="pill kind-note">entry</span>}
                  {d.logs.length > 0 && <span className="muted">{d.logs.length} logs</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
