import React, {useEffect, useMemo, useRef, useState} from "react";
import {Card, Empty, Icon} from "../ui.jsx";
import {focusByDay, activeDays, currentStreak, longestStreak, getDay, habitDays, toggleHabit, addHabit, removeHabit, MOODS} from "../../../src/lib/model.js";
import {addDays, lastNDays, parseKey, fmtMinutes, prettyDate} from "../../../src/lib/dates.js";
import {heatmap} from "../../../src/lib/heatmap.js";

const KIND_NAMES = {win: "Wins", til: "TILs", blocker: "Blockers", bug: "Bugs", idea: "Ideas", note: "Notes"};

function Heatmap({byDay, today}) {
  const weeks = 26;
  const {grid, months} = heatmap(byDay, weeks, today);
  const scroller = useRef(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; }, []);
  const monthLabels = [];
  for (let c = 0; c < weeks; c++) { const m = months.slice(c * 2, c * 2 + 3).trim(); if (m.length === 3 && months[c * 2] !== " ") monthLabels.push([c, m]); }
  return (
    <div className="heat-wrap" ref={scroller}>
      <div className="heat" style={{"--weeks": weeks}}>
        <div className="heat-months">{monthLabels.map(([c, m]) => <span key={c} style={{gridColumn: c + 1}}>{m}</span>)}</div>
        <div className="heat-days"><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /><span>Sun</span></div>
        <div className="heat-grid">
          {grid.flatMap((row, r) => row.map((v, c) => (
            <span key={`${r}-${c}`} className={v == null ? "future" : `l${v}`} style={{gridRow: r + 1, gridColumn: c + 1}} />
          )))}
        </div>
      </div>
    </div>
  );
}

function MoodChart({moods}) {
  const W = 300, H = 72, n = moods.length, step = W / n;
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="mood-chart" role="img" aria-label="Mood over the last 30 days">
      {[1, 3, 5].map((v) => <line key={v} x1="0" x2={W} y1={H - (v / 5) * (H - 6)} y2={H - (v / 5) * (H - 6)} className="grid" />)}
      {moods.map((m, i) => m ? (
        <rect key={i} x={i * step + 1.5} width={step - 3} y={H - (m / 5) * (H - 6)} height={(m / 5) * (H - 6)} rx="2" className={`mbar m${m}`} />
      ) : <rect key={i} x={i * step + 1.5} width={step - 3} y={H - 2} height="2" className="mbar none" />)}
      <text x="0" y={H + 12} className="axis">30 days ago</text>
      <text x={W} y={H + 12} className="axis" textAnchor="end">today</text>
    </svg>
  );
}

function HabitsCard({state, update, today}) {
  const days = lastNDays(14, today);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(null);
  return (
    <Card title="Habits" action={<span className="muted small">last 14 days</span>}>
      <div className="habit-grid-wrap">
        <table className="habit-grid">
          <thead><tr><th />{days.map((k) => <th key={k} className={k === today ? "today" : ""}>{"MTWTFSS"[(parseKey(k).getDay() + 6) % 7]}</th>)}<th>streak</th></tr></thead>
          <tbody>
            {state.habits.map((h) => {
              const set = habitDays(state, h.id);
              return (
                <tr key={h.id}>
                  <th scope="row">{h.name}</th>
                  {days.map((k) => (
                    <td key={k}>
                      <button className={`cell ${set.has(k) ? "on" : ""}`} aria-pressed={set.has(k)} aria-label={`${h.name}, ${prettyDate(k)}`}
                        onClick={() => update((s) => toggleHabit(s, k, h.id))} />
                    </td>
                  ))}
                  <td className="mono streak-cell">{currentStreak(set, today)}<span className="muted">/{longestStreak(set)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">Tap any square to fix a day you forgot. Streak shows current/best.</p>
      <details className="manage">
        <summary>Edit habits</summary>
        <form className="add-row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { update((s) => addHabit(s, name)); setName(""); } }}>
          <input id="habit-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit, e.g. Write a test first" />
          <button className="btn primary icon" aria-label="Add habit"><Icon name="plus" /></button>
        </form>
        <ul className="list">
          {state.habits.map((h) => (
            <li key={h.id}>
              <span className="grow">{h.name}</span>
              {confirm === h.id
                ? <><button className="btn small danger" onClick={() => { update((s) => removeHabit(s, h.id)); setConfirm(null); }}>Delete</button>
                  <button className="btn small" onClick={() => setConfirm(null)}>Keep</button></>
                : <button className="icon-btn subtle" aria-label={`Delete ${h.name}`} onClick={() => setConfirm(h.id)}><Icon name="x" size={16} /></button>}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export default function Insights({state, update, today}) {
  const d = useMemo(() => {
    const byDay = focusByDay(state);
    const active = activeDays(state, Object.keys(state.journal));
    const sum = (keys) => keys.reduce((a, k) => a + (byDay[k] || 0), 0);
    const week = lastNDays(7, today);
    const weekStart = parseKey(week[0]).getTime();
    const byTask = {};
    for (const s of state.sessions) if (s.start >= weekStart) byTask[s.task || "Unlabelled"] = (byTask[s.task || "Unlabelled"] || 0) + s.minutes;
    const month = lastNDays(30, today);
    const kinds = {};
    for (const k of month) for (const l of getDay(state, k).logs) kinds[l.kind] = (kinds[l.kind] || 0) + 1;
    const moods = month.map((k) => getDay(state, k).mood);
    const rated = moods.filter(Boolean);
    return {
      byDay, week: sum(week), prev: sum(lastNDays(7, addDays(today, -7))), todayMin: byDay[today] || 0,
      streak: currentStreak(active, today), best: longestStreak(active),
      done: state.tasks.filter((t) => t.done && t.doneAt >= weekStart).length,
      byTask: Object.entries(byTask).sort((a, b) => b[1] - a[1]).slice(0, 5),
      kinds, moods, avg: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
    };
  }, [state, today]);
  const delta = d.prev ? Math.round(((d.week - d.prev) / d.prev) * 100) : null;
  const maxTask = d.byTask[0]?.[1] || 1;

  return (
    <div className="stack">
      <div className="tiles">
        <div className="tile"><span className="tile-label">Focus this week</span><span className="tile-value mono">{fmtMinutes(d.week)}</span>
          <span className={`tile-sub ${delta == null ? "" : delta >= 0 ? "up" : "down"}`}>{delta == null ? "no data last week" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs last week`}</span></div>
        <div className="tile"><span className="tile-label">Streak</span><span className="tile-value mono">{d.streak}d</span><span className="tile-sub">best {d.best} days</span></div>
        <div className="tile"><span className="tile-label">Today</span><span className="tile-value mono">{fmtMinutes(d.todayMin)}</span><span className="tile-sub">focused</span></div>
        <div className="tile"><span className="tile-label">Tasks done</span><span className="tile-value mono">{d.done}</span><span className="tile-sub">last 7 days</span></div>
      </div>

      <Card title="Focus, last 26 weeks">
        <Heatmap byDay={d.byDay} today={today} />
        <div className="heat-legend"><span className="muted small">less</span>{[0, 1, 2, 3, 4].map((l) => <span key={l} className={`l${l}`} />)}<span className="muted small">more · 25m · 1h · 2h+</span></div>
      </Card>

      <HabitsCard state={state} update={update} today={today} />

      <Card title="Mood, last 30 days" action={<span className="mono muted">{d.avg ? `avg ${d.avg.toFixed(1)} ${MOODS[Math.round(d.avg) - 1].emoji}` : "no ratings"}</span>}>
        <MoodChart moods={d.moods} />
      </Card>

      <Card title="Focus by task, last 7 days">
        {d.byTask.length === 0 ? <Empty>Label your focus blocks to see where the time goes.</Empty> : (
          <ul className="bars">{d.byTask.map(([t, m]) => (
            <li key={t}><div className="bar-label"><span>{t}</span><span className="mono muted">{fmtMinutes(m)}</span></div>
              <div className="meter"><span style={{width: `${(m / maxTask) * 100}%`}} /></div></li>))}</ul>
        )}
      </Card>

      <Card title="Logs, last 30 days">
        <div className="kind-counts">
          {Object.entries(KIND_NAMES).map(([k, label]) => (
            <div key={k} className={`kind-count kind-${k}`}><span className="mono">{d.kinds[k] || 0}</span><span>{label}</span></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
