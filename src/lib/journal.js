// Long-form journal entries live as plain markdown: ~/.devlog/journal/YYYY-MM-DD.md
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {journalDir, ensureDirs} from "./store.js";

export const journalPath = (k) => path.join(journalDir(), `${k}.md`);
export const hasJournal = (k) => fs.existsSync(journalPath(k));
export const readJournal = (k) => { try { return fs.readFileSync(journalPath(k), "utf8"); } catch { return ""; } };
export const journalDays = () => {
  try { return fs.readdirSync(journalDir()).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).map((f) => f.slice(0, 10)); }
  catch { return []; }
};

export {PROMPTS, promptFor, template} from "./prompts.js";
import {template} from "./prompts.js";

export function ensureJournal(k, ctx) {
  ensureDirs();
  if (!hasJournal(k)) fs.writeFileSync(journalPath(k), template(k, ctx));
  return journalPath(k);
}

const which = (bin) => spawnSync("sh", ["-c", `command -v ${bin}`], {stdio: "ignore"}).status === 0;
export const resolveEditor = () =>
  process.env.VISUAL || process.env.EDITOR || (which("nano") ? "nano" : "vi");

/** Blocks until the editor exits. $EDITOR may include args, e.g. "code -w". */
export function openInEditor(file) {
  const quoted = `'${file.replace(/'/g, `'\\''`)}'`;
  const r = spawnSync(`${resolveEditor()} ${quoted}`, {stdio: "inherit", shell: true});
  return r.status ?? 1;
}
