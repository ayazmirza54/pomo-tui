import React, {useState} from "react";
import {Card, Empty, Icon, TagText} from "../ui.jsx";
import {addTask, toggleTask, cyclePriority, removeTask, sortedTasks} from "../../../src/lib/model.js";
import {dayKey, prettyDate} from "../../../src/lib/dates.js";

export default function Tasks({state, update, say, timer, setTab}) {
  const [text, setText] = useState("");
  const [view, setView] = useState("open");
  const all = sortedTasks(state.tasks);
  const list = all.filter((t) => (view === "open" ? !t.done : t.done));
  const openCount = all.filter((t) => !t.done).length;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    update((s) => addTask(s, text));
    setText("");
  };
  const del = (t) => {
    update((s) => removeTask(s, t.id));
    say("Task deleted", {label: "Undo", run: () => update((s) => ({...s, tasks: [...s.tasks, t]}))});
  };

  return (
    <div className="stack">
      <form className="add-row" onSubmit={submit}>
        <input id="task-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="New task: “!! fix login #auth”" autoComplete="off" enterKeyHint="done" />
        <button className="btn primary icon" aria-label="Add task"><Icon name="plus" /></button>
      </form>
      <p className="hint">Start with ! , !! or !!! to set priority. Add #tags anywhere.</p>

      <div className="seg wide" role="tablist">
        <button role="tab" aria-selected={view === "open"} className={view === "open" ? "on" : ""} onClick={() => setView("open")}>Open · {openCount}</button>
        <button role="tab" aria-selected={view === "done"} className={view === "done" ? "on" : ""} onClick={() => setView("done")}>Done · {all.length - openCount}</button>
      </div>

      <Card>
        {list.length === 0 ? <Empty>{view === "open" ? "Nothing open. Add a task above." : "Completed tasks will show up here."}</Empty> : (
          <ul className="list tasks">
            {list.map((t) => (
              <li key={t.id} className={t.done ? "done" : ""}>
                <button className="box-btn" aria-label={t.done ? "Mark as open" : "Mark as done"} onClick={() => update((s) => toggleTask(s, t.id))}>
                  <span className={`box ${t.done ? "on" : ""}`}>{t.done && <Icon name="check" size={14} />}</span>
                </button>
                <button className={`prio p${t.priority}`} aria-label="Change priority" onClick={() => update((s) => cyclePriority(s, t.id))}>
                  {t.priority ? "!".repeat(t.priority) : "·"}
                </button>
                <span className="grow">
                  <TagText text={t.text} />
                  {t.done && t.doneAt && <span className="muted small block">done {prettyDate(dayKey(new Date(t.doneAt)))}</span>}
                </span>
                {!t.done && (
                  <button className="icon-btn subtle" aria-label={`Focus on ${t.text}`} onClick={() => { timer.setTask(t.text); setTab("focus"); }}>
                    <Icon name="target" size={18} />
                  </button>
                )}
                <button className="icon-btn subtle" aria-label="Delete task" onClick={() => del(t)}><Icon name="x" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
