import {test, before} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import {render} from "ink-testing-library";

process.env.DEVLOG_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "devlog-test-"));
const {default: App} = await import("../src/tui/App.jsx");
const {mutate, load} = await import("../src/lib/store.js");
const {addLog, addTask, addSession} = await import("../src/lib/model.js");

const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

before(() => {
  mutate((s) => {
    s = addLog(s, "til: ink renders React to the terminal");
    s = addTask(s, "!!! fix prod #oncall");
    return addSession(s, {start: Date.now() - 30 * 60e3, end: Date.now(), minutes: 25, task: "fix prod"});
  });
});

for (const [i, key, expect] of [
  [1, "today", /Quick log/],
  [2, "journal", /Entries/],
  [3, "focus", /FOCUS/],
  [4, "tasks", /fix prod/],
  [5, "habits", /Ship a commit/],
  [6, "stats", /Focus heatmap/],
]) {
  test(`renders ${key} view`, async () => {
    const app = render(React.createElement(App, {initialTab: key}));
    await tick();
    try {
      const frame = app.lastFrame();
      assert.match(frame, expect, frame);
    } finally { app.unmount(); }
  });
}

test("quick log via keyboard persists to disk", async () => {
  const app = render(React.createElement(App, {initialTab: "today"}));
  await tick();
  app.stdin.write("a");
  await tick();
  assert.match(app.lastFrame(), /log \(til:/);
  app.stdin.write("win: shipped devlog");
  await tick();
  app.stdin.write("\r");
  await tick();
  assert.match(app.lastFrame(), /shipped devlog/);
  const logs = Object.values(load().days).flatMap((d) => d.logs);
  assert.ok(logs.some((l) => l.kind === "win" && l.text === "shipped devlog"));
  app.unmount();
});

test("number keys switch tabs and tasks toggle", async () => {
  const app = render(React.createElement(App, {initialTab: "today"}));
  await tick();
  app.stdin.write("4");
  await tick();
  assert.match(app.lastFrame(), /1 open/);
  app.stdin.write("x");
  await tick();
  assert.match(app.lastFrame(), /0 open/);
  app.unmount();
});
