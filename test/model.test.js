import {test} from "node:test";
import assert from "node:assert/strict";
import {emptyState, parseLog, addLog, removeLog, setMood, addTask, toggleTask, sortedTasks,
  toggleHabit, habitDays, addSession, focusByDay, currentStreak, longestStreak, migrate, parseTask} from "../src/lib/model.js";
import {addDays, lastNDays, weekdayIdx} from "../src/lib/dates.js";
import {heatmap, level} from "../src/tui/views/Stats.jsx";
import {bigText} from "../src/lib/bigText.js";

test("parseLog recognises kinds and aliases", () => {
  assert.deepEqual(parseLog("til: x"), {kind: "til", text: "x"});
  assert.deepEqual(parseLog("Blocked! CI"), {kind: "blocker", text: "CI"});
  assert.deepEqual(parseLog("shipped: v2"), {kind: "win", text: "v2"});
  assert.deepEqual(parseLog("http: not a kind"), {kind: "note", text: "http: not a kind"});
  assert.deepEqual(parseLog("til:"), {kind: "note", text: "til:"});
});

test("logs add/remove without mutating", () => {
  const s0 = emptyState();
  const s1 = addLog(s0, "win: merged", "2026-01-01", 1);
  assert.equal(Object.keys(s0.days).length, 0);
  assert.equal(s1.days["2026-01-01"].logs[0].kind, "win");
  assert.equal(removeLog(s1, "2026-01-01", 0).days["2026-01-01"].logs.length, 0);
  assert.equal(setMood(s1, "2026-01-01", 9).days["2026-01-01"].mood, 5);
});

test("tasks: priority parsing and sort order", () => {
  assert.deepEqual(parseTask("!!! prod down"), {priority: 3, text: "prod down"});
  let s = addTask(emptyState(), "low", 1);
  s = addTask(s, "!! high", 2);
  s = addTask(s, "   ", 3);
  assert.equal(s.tasks.length, 2);
  s = toggleTask(s, s.tasks[1].id, 5);
  assert.deepEqual(sortedTasks(s.tasks).map((t) => t.text), ["low", "high"]);
});

test("habits & streaks", () => {
  let s = emptyState();
  const id = s.habits[0].id;
  for (const k of ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-05"]) s = toggleHabit(s, k, id);
  const set = habitDays(s, id);
  assert.equal(currentStreak(set, "2026-03-05"), 1);
  assert.equal(currentStreak(set, "2026-03-04"), 3); // today not done yet → count from yesterday
  assert.equal(currentStreak(set, "2026-03-07"), 0);
  assert.equal(longestStreak(set), 3);
});

test("focus sessions aggregate per local day", () => {
  const t = new Date(2026, 4, 2, 10).getTime();
  let s = addSession(emptyState(), {start: t, end: t + 1, minutes: 25, task: "a"});
  s = addSession(s, {start: t + 3600e3, end: t, minutes: 24.6, task: "b"});
  assert.deepEqual(focusByDay(s), {"2026-05-02": 50});
});

test("dates", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.deepEqual(lastNDays(3, "2026-01-01"), ["2025-12-30", "2025-12-31", "2026-01-01"]);
  assert.equal(weekdayIdx("2026-11-23"), 0); // Monday
});

test("heatmap shape and future cells", () => {
  const {grid, months} = heatmap({"2026-11-24": 130, "2026-11-23": 10}, 4, "2026-11-24");
  assert.equal(grid.length, 7);
  assert.equal(grid[0].length, 4);
  assert.equal(grid[0][3], level(10));
  assert.equal(grid[1][3], 4);
  assert.equal(grid[2][3], null); // Wednesday is in the future
  assert.equal(months.length, 8);
  assert.match(months, /Nov/);
});

test("migrate keeps user data and fills defaults", () => {
  const m = migrate({settings: {work: 50}, habits: []});
  assert.equal(m.settings.work, 50);
  assert.equal(m.settings.short, 5);
  assert.deepEqual(m.habits, []);
});

test("bigText renders aligned rows", () => {
  const rows = bigText("25:00");
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => r.length === rows[0].length));
});
