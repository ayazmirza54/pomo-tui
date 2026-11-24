import path from "node:path";
import fs from "node:fs";
import {load, mutate, devlogHome} from "./lib/store.js";
import {addLog, addTask, setMood, setEnergy, toggleTask, sortedTasks, getDay, sessionsOn,
  LOG_KINDS, MOODS, DEFAULT_SETTINGS} from "./lib/model.js";
import {dayKey, addDays, isDayKey, clock, fmtMinutes, prettyDate} from "./lib/dates.js";
import {ensureJournal, openInEditor} from "./lib/journal.js";
import {exportMarkdown} from "./lib/export.js";
import {commitsOn, resolveRepos, repoRoot} from "./lib/git.js";

const HELP = `devlog — a developer's diary, journal & focus tracker for the terminal

Usage
  devlog                     open the TUI
  devlog ui [view]           open the TUI on a view: today journal focus tasks habits stats
  devlog focus|journal|...   shortcut for \`devlog ui <view>\` (except today/tasks, which print)
  devlog log <text>          quick log; prefix with til: win: blocker: bug: idea:
  devlog task <text>         add a task (!, !!, !!! = priority; #tags)
  devlog tasks               list open tasks
  devlog done <n>            complete open task #n (from \`devlog tasks\`)
  devlog mood <1-5>          set today's mood       devlog energy <1-5>
  devlog edit [YYYY-MM-DD]   open a journal entry in $EDITOR (default: today)
  devlog today               print today's summary
  devlog export [from] [to]  markdown report to stdout (default: last 7 days)
  devlog repo add|rm [path]  track a git repo for "commits today"   devlog repo ls
  devlog config [key] [val]  show/set: work short long rounds gitAuthor
  devlog path                print the data directory

Data: ${"$"}DEVLOG_HOME or ~/.devlog  (data.json + journal/*.md — git it!)`;

const die = (msg) => { console.error(`devlog: ${msg}`); process.exit(1); };
const today = dayKey();
const VIEWS = ["today", "journal", "focus", "tasks", "habits", "stats"];

async function tui(initialTab) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) die("the TUI needs an interactive terminal (try `devlog help`)");
  const [{default: React}, {render}, {default: App}, {enterAlt, exitAlt}] = await Promise.all([
    import("react"), import("ink"), import("./tui/App.jsx"), import("./tui/screen.js"),
  ]);
  enterAlt();
  process.on("exit", exitAlt);
  const app = render(React.createElement(App, {initialTab}), {exitOnCtrlC: true});
  await app.waitUntilExit();
}

async function printToday() {
  const s = load();
  const d = getDay(s, today);
  const sessions = sessionsOn(s, today);
  const mins = sessions.reduce((a, x) => a + x.minutes, 0);
  console.log(`\n  ${prettyDate(today, {year: "numeric"})}`);
  console.log(`  mood ${d.mood ? MOODS[d.mood - 1].emoji : "—"}  energy ${d.energy ?? "—"}  focus ${fmtMinutes(mins)} (${sessions.length} 🍅)`);
  const habits = s.habits.map((h) => `${d.habits[h.id] ? "■" : "□"} ${h.name}`);
  console.log(`  ${habits.join("  ")}\n`);
  for (const l of d.logs) console.log(`  ${clock(new Date(l.t))} ${LOG_KINDS[l.kind].icon} ${l.text}`);
  const commits = await commitsOn(today, {repos: await resolveRepos(s.settings), author: s.settings.gitAuthor});
  if (commits.length) {
    console.log("");
    for (const c of commits) console.log(`  ${c.time} ${c.hash} ${c.subject} (${c.repo})`);
  }
  const open = sortedTasks(s.tasks).filter((t) => !t.done).slice(0, 5);
  if (open.length) {
    console.log("\n  up next:");
    for (const t of open) console.log(`   ${"!".repeat(t.priority).padEnd(3)} ${t.text}`);
  }
  console.log("");
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const text = rest.join(" ").trim();

  if (!cmd) return tui("today");

  switch (cmd) {
    case "help": case "-h": case "--help":
      return console.log(HELP);

    case "log": case "l": {
      if (!text) die("nothing to log");
      const s = mutate((st) => addLog(st, text));
      const l = getDay(s, today).logs.at(-1);
      return console.log(`${LOG_KINDS[l.kind].icon} logged ${l.kind}: ${l.text}`);
    }
    case "task": case "t": case "todo": {
      if (!text) die("task text required");
      mutate((st) => addTask(st, text));
      return console.log(`📋 added: ${text}`);
    }
    case "tasks": {
      const open = sortedTasks(load().tasks).filter((t) => !t.done);
      if (!open.length) return console.log("No open tasks 🎉");
      return open.forEach((t, i) => console.log(`${String(i + 1).padStart(3)}. ${"!".repeat(t.priority).padEnd(3)} ${t.text}`));
    }
    case "done": {
      const n = parseInt(rest[0], 10);
      const open = sortedTasks(load().tasks).filter((t) => !t.done);
      const t = open[n - 1];
      if (!t) die(`no open task #${rest[0] ?? ""} (see \`devlog tasks\`)`);
      mutate((st) => toggleTask(st, t.id));
      return console.log(`✓ ${t.text}`);
    }
    case "mood": case "energy": {
      const n = parseInt(rest[0], 10);
      if (!(n >= 1 && n <= 5)) die(`${cmd} must be 1-5`);
      mutate((st) => (cmd === "mood" ? setMood : setEnergy)(st, today, n));
      return console.log(`${cmd} set to ${n}${cmd === "mood" ? " " + MOODS[n - 1].emoji : ""}`);
    }
    case "edit": case "write": case "journal": {
      const k = rest[0] || today;
      if (!isDayKey(k)) die("date must be YYYY-MM-DD");
      const s = load();
      const commits = k === today ? await commitsOn(k, {repos: await resolveRepos(s.settings), author: s.settings.gitAuthor}) : [];
      process.exit(openInEditor(ensureJournal(k, {commits})));
    }
    case "today": case "status":
      return printToday();

    case "export": {
      const from = rest[0] || addDays(today, -6);
      const to = rest[1] || today;
      if (!isDayKey(from) || !isDayKey(to)) die("dates must be YYYY-MM-DD");
      return process.stdout.write(exportMarkdown(load(), from, to));
    }
    case "repo": {
      const [sub, p] = rest;
      if (sub === "ls" || !sub) {
        const repos = load().settings.repos;
        return console.log(repos.length ? repos.join("\n") : "No repos configured (using the current repo, if any).");
      }
      const target = path.resolve(p || ".");
      if (sub === "add") {
        const root = await repoRoot(target);
        if (!root) die(`${target} is not a git repository`);
        mutate((st) => ({...st, settings: {...st.settings, repos: [...new Set([...st.settings.repos, root])]}}));
        return console.log(`tracking ${root}`);
      }
      if (sub === "rm") {
        mutate((st) => ({...st, settings: {...st.settings, repos: st.settings.repos.filter((r) => r !== target)}}));
        return console.log(`stopped tracking ${target}`);
      }
      return die("usage: devlog repo add|rm|ls [path]");
    }
    case "config": {
      const [key, val] = rest;
      const s = load();
      if (!key) return console.log(JSON.stringify(s.settings, null, 2));
      if (!(key in DEFAULT_SETTINGS) || key === "repos") die(`unknown key "${key}"`);
      if (val === undefined) return console.log(s.settings[key]);
      const v = typeof DEFAULT_SETTINGS[key] === "number" ? Number(val) : val;
      if (typeof v === "number" && !(v > 0)) die(`${key} must be a positive number`);
      mutate((st) => ({...st, settings: {...st.settings, [key]: v}}));
      return console.log(`${key} = ${v}`);
    }
    case "path":
      fs.mkdirSync(devlogHome(), {recursive: true});
      return console.log(devlogHome());

    case "ui": case "open":
      if (rest[0] && !VIEWS.includes(rest[0])) die(`unknown view "${rest[0]}" (${VIEWS.join(", ")})`);
      return tui(rest[0] || "today");

    default:
      if (VIEWS.includes(cmd)) return tui(cmd);
      die(`unknown command "${cmd}" — try \`devlog help\``);
  }
}

main(process.argv.slice(2)).catch((e) => die(e.message));
