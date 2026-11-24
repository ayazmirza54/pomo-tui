import React, {useRef, useState} from "react";
import {Icon} from "../ui.jsx";
import {shareText, isNative} from "../native.js";
import {exportMarkdown} from "../exportMd.js";
import {importBackup, sampleState, normalize} from "../store.js";
import {emptyState} from "../../../src/lib/model.js";
import {addDays} from "../../../src/lib/dates.js";

const NUMS = [["work", "Focus", 5, 120], ["short", "Short break", 1, 30], ["long", "Long break", 5, 60], ["rounds", "Blocks per cycle", 2, 8]];

export default function Settings({state, update, say, today, onClose}) {
  const s = state.settings;
  const set = (patch) => update((st) => ({...st, settings: {...st.settings, ...patch}}));
  const [gh, setGh] = useState(s.githubUser);
  const [range, setRange] = useState(7);
  const [erase, setErase] = useState(false);
  const file = useRef(null);
  const verb = isNative ? "Share" : "Copy";

  const exportMd = async () => {
    const r = await shareText("devlog export", exportMarkdown(state, addDays(today, -(range - 1)), today));
    say(r === "shared" ? "Export ready" : r === "copied" ? "Markdown copied to clipboard" : "Couldn't share or copy the export");
  };
  const backup = async () => {
    const r = await shareText("devlog backup", JSON.stringify(state));
    say(r === "shared" ? "Backup ready" : r === "copied" ? "Backup copied. Save it somewhere safe." : "Couldn't share or copy the backup");
  };
  const restore = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { update((cur) => importBackup(cur, String(reader.result))); say("Backup restored"); onClose(); }
      catch (err) { say(err instanceof SyntaxError ? "That file isn't valid JSON." : err.message); }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Settings</h2>
          <button className="icon-btn" aria-label="Close settings" onClick={onClose}><Icon name="x" /></button>
        </header>

        <section className="set-group">
          <h3>Appearance</h3>
          <div className="seg wide">
            {["system", "light", "dark"].map((a) => (
              <button key={a} className={s.appearance === a ? "on" : ""} onClick={() => set({appearance: a})}>{a[0].toUpperCase() + a.slice(1)}</button>
            ))}
          </div>
        </section>

        <section className="set-group">
          <h3>Focus timer (minutes)</h3>
          <div className="num-grid">
            {NUMS.map(([k, label, min, max]) => (
              <label key={k} className="num">
                <span>{label}</span>
                <input id={`set-${k}`} type="number" inputMode="numeric" min={min} max={max} value={s[k]}
                  onChange={(e) => { const v = Math.round(Number(e.target.value)); if (v >= min && v <= max) set({[k]: v}); }} />
              </label>
            ))}
          </div>
        </section>

        <section className="set-group">
          <h3>GitHub</h3>
          <form className="add-row" onSubmit={(e) => { e.preventDefault(); set({githubUser: gh.trim().replace(/^@/, "")}); say(gh.trim() ? "GitHub username saved" : "GitHub disconnected"); }}>
            <input id="set-github" value={gh} onChange={(e) => setGh(e.target.value)} placeholder="your-username" autoCapitalize="none" autoCorrect="off" />
            <button className="btn">Save</button>
          </form>
          <p className="hint">Shows your public pushes on Today. No token needed; nothing else is sent.</p>
        </section>

        <section className="set-group">
          <h3>Your data</h3>
          <div className="row gap wrap">
            <select id="set-range" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Export range">
              <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={365}>Last year</option>
            </select>
            <button className="btn" onClick={exportMd}><Icon name="share" size={16} /> {verb} as Markdown</button>
          </div>
          <div className="row gap wrap">
            <button className="btn" onClick={backup}><Icon name="share" size={16} /> {verb} backup</button>
            <button className="btn" onClick={() => file.current?.click()}>Restore from file</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={restore} />
          </div>
          <p className="hint">Restore also accepts <span className="mono">~/.devlog/data.json</span> from the devlog terminal app.</p>
          {!s.onboarded || state.tasks.length === 0 ? (
            <button className="btn small" onClick={() => { update((st) => sampleState(st)); say("Sample data added"); onClose(); }}>Add sample data</button>
          ) : null}
          {erase ? (
            <div className="confirm">
              <span>Erase every log, entry, task and focus block on this device?</span>
              <div className="row gap">
                <button className="btn danger" onClick={() => { update(() => normalize({...emptyState(), settings: {...emptyState().settings, appearance: s.appearance, onboarded: true}})); setErase(false); say("Everything erased"); onClose(); }}>Erase everything</button>
                <button className="btn" onClick={() => setErase(false)}>Cancel</button>
              </div>
            </div>
          ) : <button className="btn danger-quiet small" onClick={() => setErase(true)}>Erase all data…</button>}
        </section>

        <p className="hint about">devlog 0.1 · stored only on this device · terminal version in <span className="mono">ayazmirza54/pomo-tui</span></p>
      </div>
    </div>
  );
}
