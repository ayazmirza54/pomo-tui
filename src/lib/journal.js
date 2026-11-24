// Long-form journal entries live as plain markdown: ~/.devlog/journal/YYYY-MM-DD.md
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {journalDir, ensureDirs} from "./store.js";
import {prettyDate} from "./dates.js";

export const journalPath = (k) => path.join(journalDir(), `${k}.md`);
export const hasJournal = (k) => fs.existsSync(journalPath(k));
export const readJournal = (k) => { try { return fs.readFileSync(journalPath(k), "utf8"); } catch { return ""; } };
export const journalDays = () => {
  try { return fs.readdirSync(journalDir()).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).map((f) => f.slice(0, 10)); }
  catch { return []; }
};

export const PROMPTS = [
  "What would you tell yesterday-you before they opened the editor?",
  "What took longer than expected today, and why?",
  "Which piece of code are you quietly proud of?",
  "What did you debug today, and what was the real root cause?",
  "What's one thing you'd refactor if you had a free afternoon?",
  "Who unblocked you (or who did you unblock) today?",
  "What did you learn that isn't in the docs?",
  "What drained your energy today? What gave it back?",
  "If today had a commit message, what would it be?",
  "What's the smallest next step on the thing you're avoiding?",
  "Which decision today will matter in six months?",
  "What question do you wish you had asked earlier?",
];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const promptFor = (k) => PROMPTS[hash(k) % PROMPTS.length];

export function template(k, {commits = []} = {}) {
  const lines = [
    `# ${prettyDate(k, {year: "numeric"})}`,
    "",
    `> 💭 ${promptFor(k)}`,
    "",
    "## 🚀 Shipped", "", "",
    "## 🧱 Blockers", "", "",
    "## 💡 TIL", "", "",
    "## 🎯 Tomorrow", "", "",
    "## 📝 Notes", "", "",
  ];
  if (commits.length) {
    lines.push("## 🔀 Commits", "");
    for (const c of commits) lines.push(`- \`${c.hash}\` ${c.subject} _(${c.repo})_`);
    lines.push("");
  }
  return lines.join("\n");
}

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
