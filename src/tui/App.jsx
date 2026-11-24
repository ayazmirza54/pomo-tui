import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, Text, useApp, useInput, useStdin, useStdout} from "ink";
import {useStore, useSize, useNow, useFocusTimer} from "./hooks.js";
import {themeOf, THEMES} from "./theme.js";
import {Prompt} from "./ui.jsx";
import {enterAlt, exitAlt} from "./screen.js";
import {addSession} from "../lib/model.js";
import {openInEditor} from "../lib/journal.js";
import {clock, fmtMinutes} from "../lib/dates.js";
import Today from "./views/Today.jsx";
import Journal from "./views/Journal.jsx";
import Focus, {fmtTimer} from "./views/Focus.jsx";
import Tasks from "./views/Tasks.jsx";
import Habits from "./views/Habits.jsx";
import Stats from "./views/Stats.jsx";
import Help from "./views/Help.jsx";

export const TABS = [
  {key: "today", label: "Today", View: Today, hints: "a log · m mood · n energy · e journal · u undo · g git · s focus"},
  {key: "journal", label: "Journal", View: Journal, hints: "↑↓ day · enter/e edit · / search · J/K scroll · t today"},
  {key: "focus", label: "Focus", View: Focus, hints: "space start/pause · l label · f finish+log · n skip · +/- min · r reset"},
  {key: "tasks", label: "Tasks", View: Tasks, hints: "a add (!/!!/!!! prio) · x done · p prio · enter focus · d del · h hide done"},
  {key: "habits", label: "Habits", View: Habits, hints: "↑↓ habit · ←→ day · x toggle · a add · d del"},
  {key: "stats", label: "Stats", View: Stats, hints: "your numbers, at a glance"},
];

export default function App({initialTab = "today"}) {
  const {exit} = useApp();
  const {setRawMode} = useStdin();
  const {write} = useStdout();
  const {cols, rows} = useSize();
  const {state, update, reload} = useStore();
  const theme = themeOf(state.settings);
  const now = useNow(1000);

  const [tab, setTab] = useState(Math.max(0, TABS.findIndex((t) => t.key === initialTab)));
  const [prompt, setPrompt] = useState(null);
  const [help, setHelp] = useState(false);
  const [flash, setFlash] = useState(null);
  const [fsVersion, setFsVersion] = useState(0);
  const flashTimer = useRef(null);

  const say = useCallback((msg) => {
    setFlash(msg);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 3000);
  }, []);
  const ask = useCallback((label, onSubmit, initial = "") => setPrompt({label, onSubmit, initial}), []);

  const timer = useFocusTimer(state.settings, (sess) => {
    update((s) => addSession(s, sess));
    say(`🍅 Logged ${fmtMinutes(sess.minutes)} of focus${sess.task ? ` on “${sess.task}”` : ""}`);
  });

  const openEditor = useCallback((file) => {
    setRawMode(false);
    exitAlt();
    const code = openInEditor(file);
    enterAlt();
    setRawMode(true);
    write(""); // forces Ink to repaint the whole frame on the fresh screen
    reload();
    setFsVersion((v) => v + 1);
    if (code !== 0) say(`Editor exited with code ${code}`);
  }, [setRawMode, write, reload, say]);

  const quit = () => { timer.flush(); exit(); };

  useInput((input, key) => {
    if (input === "q") return quit();
    if (input === "?") return setHelp((h) => !h);
    if (help && key.escape) return setHelp(false);
    if (/^[1-6]$/.test(input)) { setHelp(false); return setTab(+input - 1); }
    if (key.tab) return setTab((i) => (i + (key.shift ? TABS.length - 1 : 1)) % TABS.length);
    if (input === ",") {
      update((s) => ({...s, settings: {...s.settings, theme: ((s.settings.theme || 0) + 1) % THEMES.length}}));
      say(`Theme: ${THEMES[((state.settings.theme || 0) + 1) % THEMES.length].name}`);
    }
  }, {isActive: !prompt});

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const height = Math.max(10, rows - 1); // < rows avoids Ink's full-clear flicker path
  const bodyHeight = height - 3;
  const {View} = TABS[tab];

  const timerBadge = timer.startedAt || timer.running
    ? `${timer.running ? "▶" : "‖"} ${timer.phase === "WORK" ? "🍅" : "☕"} ${fmtTimer(timer.remaining)}  `
    : "";

  return (
    <Box flexDirection="column" width={cols} height={height}>
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={theme.accent}> ◆ devlog  </Text>
          {TABS.map((t, i) => (
            <Text key={t.key} color={i === tab ? theme.accent : theme.dim} bold={i === tab} inverse={i === tab}>
              {` ${i + 1} ${t.label} `}
            </Text>
          ))}
        </Box>
        <Text color={theme.fg}>{timerBadge}<Text color={theme.dim}>{clock(new Date(now))} </Text></Text>
      </Box>
      <Text color={theme.border}>{"─".repeat(cols)}</Text>

      <Box height={bodyHeight} flexDirection="column" overflow="hidden">
        {help
          ? <Help theme={theme} />
          : <View
              state={state} update={update} ask={ask} say={say} theme={theme}
              active={!prompt && !help} timer={timer} openEditor={openEditor}
              setTab={(k) => setTab(TABS.findIndex((t) => t.key === k))}
              width={cols} height={bodyHeight} fsVersion={fsVersion} now={now}
            />}
      </Box>

      <Box>
        {prompt
          ? <Prompt theme={theme} label={prompt.label} initial={prompt.initial}
              onCancel={() => setPrompt(null)}
              onSubmit={(v) => { setPrompt(null); prompt.onSubmit(v); }} />
          : flash
            ? <Text color={theme.good}> {flash}</Text>
            : <Text color={theme.dim} wrap="truncate-end"> {TABS[tab].hints}  ·  1-6 tabs · , theme · ? help · q quit</Text>}
      </Box>
    </Box>
  );
}
