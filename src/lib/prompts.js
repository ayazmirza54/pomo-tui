// Pure (no Node APIs) so the mobile app can share it.
import {prettyDate} from "./dates.js";

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
