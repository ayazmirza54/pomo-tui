import React from "react";
import {Card, Empty, Icon} from "../ui.jsx";
import {sessionsOn, sortedTasks} from "../../../src/lib/model.js";
import {clock, fmtMinutes} from "../../../src/lib/dates.js";

export const fmtTimer = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const PHASE = {WORK: "Focus", SHORT: "Short break", LONG: "Long break"};

export default function Focus({state, timer, today}) {
  const R = 118, C = 2 * Math.PI * R;
  const pct = timer.phaseLen ? timer.elapsed / timer.phaseLen : 0;
  const sessions = sessionsOn(state, today);
  const total = sessions.reduce((a, x) => a + x.minutes, 0);
  const rounds = state.settings.rounds;
  const r = (timer.round - 1) % rounds;
  const open = sortedTasks(state.tasks).filter((t) => !t.done).slice(0, 4);

  return (
    <div className="stack">
      <section className={`timer ${timer.phase !== "WORK" ? "is-break" : ""}`}>
        <svg viewBox="0 0 260 260" className="ring" role="img" aria-label={`${PHASE[timer.phase]}: ${fmtTimer(timer.remaining)} left`}>
          <circle cx="130" cy="130" r={R} className="ring-track" />
          <circle cx="130" cy="130" r={R} className="ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 130 130)" />
        </svg>
        <div className="timer-center">
          <div className="phase">{PHASE[timer.phase]}</div>
          <div className="clock mono">{fmtTimer(timer.remaining)}</div>
          <div className="rounds" aria-label={`Round ${r + 1} of ${rounds}`}>
            {Array.from({length: rounds}, (_, i) => <span key={i} className={i < r || (i === r && timer.phase !== "WORK") ? "done" : i === r ? "now" : ""} />)}
          </div>
        </div>
      </section>

      <div className="timer-controls">
        <button className="btn round-btn" aria-label="One minute less" onClick={() => timer.adjust(-1)}>−1</button>
        <button className="btn primary play" onClick={timer.toggle}>
          <Icon name={timer.running ? "pause" : "play"} size={22} fill={!timer.running} />
          {timer.running ? "Pause" : timer.startedAt ? "Resume" : "Start"}
        </button>
        <button className="btn round-btn" aria-label="One minute more" onClick={() => timer.adjust(1)}>+1</button>
      </div>
      <div className="row gap center">
        <button className="btn small" onClick={timer.finish} disabled={timer.phase !== "WORK" || timer.elapsed < 60_000}><Icon name="check" size={16} /> Finish & log</button>
        <button className="btn small" onClick={timer.skip}><Icon name="skip" size={16} /> Skip</button>
        <button className="btn small" onClick={timer.reset}><Icon name="reset" size={16} /> Reset</button>
      </div>

      <Card title="Working on">
        <input id="focus-task" className="field" value={timer.task} onChange={(e) => timer.setTask(e.target.value)} placeholder="Name this block, e.g. auth refactor" />
        {open.length > 0 && (
          <div className="kinds">
            {open.map((t) => (
              <button key={t.id} className={`pill task-pick ${timer.task === t.text ? "on" : ""}`} onClick={() => timer.setTask(t.text)}>{t.text}</button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Today" action={<span className="mono">{fmtMinutes(total)}</span>}>
        {sessions.length === 0 ? <Empty>Finished blocks show up here. Breaks aren't counted.</Empty> : (
          <ul className="list">{[...sessions].reverse().map((x) => (
            <li key={x.id}><span className="mono muted">{clock(new Date(x.start))}–{clock(new Date(x.end))}</span>
              <span className="grow">{x.task || "Unlabelled"}</span><span className="mono">{x.minutes}m</span></li>))}</ul>
        )}
      </Card>
    </div>
  );
}
