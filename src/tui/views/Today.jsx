import React, {useCallback, useEffect, useState} from "react";
import {Box, Text, useInput} from "ink";
import {Panel, Dim, Bar} from "../ui.jsx";
import {getDay, addLog, removeLog, setMood, setEnergy, toggleHabit, sessionsOn, sortedTasks,
  activeDays, currentStreak, MOODS, LOG_KINDS, moodEmoji} from "../../lib/model.js";
import {dayKey, prettyDate, clock, fmtMinutes} from "../../lib/dates.js";
import {ensureJournal, journalPath, promptFor, journalDays, hasJournal} from "../../lib/journal.js";
import {commitsOn, resolveRepos} from "../../lib/git.js";

const PRIO = ["", "!", "!!", "!!!"];

export default function Today({state, update, ask, say, theme, active, timer, openEditor, setTab, width, height, now, fsVersion}) {
  const k = dayKey(new Date(now));
  const day = getDay(state, k);
  const [commits, setCommits] = useState({loading: true, list: []});
  const [habitCursor, setHabitCursor] = useState(0);

  const repoKey = state.settings.repos.join("|") + state.settings.gitAuthor;
  const loadCommits = useCallback(async () => {
    setCommits((c) => ({...c, loading: true}));
    const repos = await resolveRepos(state.settings);
    const list = await commitsOn(k, {repos, author: state.settings.gitAuthor}).catch(() => []);
    setCommits({loading: false, list, repos});
  }, [k, repoKey]); // eslint-disable-line
  useEffect(() => { loadCommits(); }, [loadCommits]);

  const ask15 = (label, fn) => ask(`${label} 1-5 (${MOODS.map((m, i) => `${i + 1}${m.emoji}`).join(" ")})`, (v) => {
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 5) update((s) => fn(s, k, n)); else if (v.trim()) say("Enter a number from 1 to 5");
  });

  useInput((input, key) => {
    if (input === "a") ask("log (til: win: blocker: bug: idea:)", (t) => {
      if (t.trim()) { update((s) => addLog(s, t, k)); say("Logged ✓"); }
    });
    else if (input === "m") ask15("mood", setMood);
    else if (input === "n") ask15("energy", setEnergy);
    else if (input === "e") openEditor(ensureJournal(k, {commits: commits.list}));
    else if (input === "u" && day.logs.length) { update((s) => removeLog(s, k, day.logs.length - 1)); say("Removed last log"); }
    else if (input === "g") loadCommits();
    else if (input === "s") { if (!timer.running) timer.toggle(); setTab("focus"); }
    else if (key.downArrow || input === "j") setHabitCursor((c) => Math.min(state.habits.length - 1, c + 1));
    else if (key.upArrow || input === "k") setHabitCursor((c) => Math.max(0, c - 1));
    else if ((input === "x" || input === " ") && state.habits[habitCursor]) update((s) => toggleHabit(s, k, state.habits[habitCursor].id));
  }, {isActive: active});

  const sessions = sessionsOn(state, k);
  const focusMin = sessions.reduce((a, x) => a + x.minutes, 0);
  const streak = currentStreak(activeDays(state, journalDays()), k);
  const openTasks = sortedTasks(state.tasks).filter((t) => !t.done);
  const doneToday = state.tasks.filter((t) => t.done && t.doneAt && dayKey(new Date(t.doneAt)) === k).length;
  const habitsDone = state.habits.filter((h) => day.habits[h.id]).length;
  const wrote = hasJournal(k); // fsVersion triggers re-render after editing
  void fsVersion;

  const rightW = Math.max(34, Math.floor(width * 0.4));
  const commitsH = Math.min(9, Math.max(4, commits.list.length + 3));
  const logRows = Math.max(1, height - 5 - commitsH - 3);
  const logs = day.logs.slice(-logRows);

  return (
    <Box flexDirection="row" height={height}>
      <Box flexDirection="column" flexGrow={1}>
        <Panel theme={theme} title={`📅 ${prettyDate(k, {year: "numeric"})}`} right={`🔥 ${streak} day streak`} height={5}>
          <Text>
            <Text color={theme.fg}>mood </Text>
            <Text>{day.mood ? `${MOODS[day.mood - 1].emoji} ${MOODS[day.mood - 1].label}` : "—"}</Text>
            <Text color={theme.fg}>    energy </Text>
            <Text color={theme.warn}>{day.energy ? "▮".repeat(day.energy) + "▯".repeat(5 - day.energy) : "—"}</Text>
            <Text color={theme.fg}>    journal </Text>
            <Text color={wrote ? theme.good : theme.dim}>{wrote ? "✎ written" : "not yet (e)"}</Text>
          </Text>
          <Dim theme={theme} wrap="truncate-end">💭 {promptFor(k)}</Dim>
        </Panel>

        <Panel theme={theme} title="⚡ Quick log" right={`${day.logs.length} today`} flexGrow={1}>
          {logs.length === 0
            ? <Dim theme={theme}>Nothing yet. Press a — try “til: git worktree is great” or “blocker: flaky CI”.</Dim>
            : logs.map((l, i) => (
              <Text key={i} wrap="truncate-end">
                <Dim theme={theme}>{clock(new Date(l.t))} </Dim>
                <Text>{LOG_KINDS[l.kind]?.icon || "•"} </Text>
                <Text color={l.kind === "blocker" || l.kind === "bug" ? theme.bad : l.kind === "win" ? theme.good : theme.fg}>{l.text}</Text>
              </Text>
            ))}
        </Panel>

        <Panel theme={theme} title="🔀 Commits today" right={commits.loading ? "…" : `${commits.list.length}`} height={commitsH}>
          {!commits.loading && commits.list.length === 0
            ? <Dim theme={theme}>{commits.repos?.length ? "No commits yet today." : "No repos — run `devlog repo add <path>` or launch inside a repo."}</Dim>
            : commits.list.slice(-(commitsH - 3)).map((c) => (
              <Text key={c.repo + c.hash} wrap="truncate-end">
                <Dim theme={theme}>{c.time} </Dim><Text color={theme.warn}>{c.hash} </Text>
                <Text color={theme.fg}>{c.subject} </Text><Dim theme={theme}>{c.repo}</Dim>
              </Text>
            ))}
        </Panel>
      </Box>

      <Box flexDirection="column" width={rightW}>
        <Panel theme={theme} title="🍅 Focus" right={`${sessions.length} blocks`} height={6}>
          <Text><Text bold color={theme.accent}>{fmtMinutes(focusMin)}</Text><Dim theme={theme}> today · goal {fmtMinutes(state.settings.work * 8)}</Dim></Text>
          <Bar theme={theme} value={focusMin} max={state.settings.work * 8} width={rightW - 6} />
          <Dim theme={theme} wrap="truncate-end">
            {timer.running ? `running: ${timer.task || timer.phase.toLowerCase()}` : "s to start a block"}
          </Dim>
        </Panel>

        <Panel theme={theme} title="✅ Habits" right={`${habitsDone}/${state.habits.length}`} height={state.habits.length + 3}>
          {state.habits.map((h, i) => (
            <Text key={h.id} wrap="truncate-end" inverse={active && i === habitCursor}>
              <Text color={day.habits[h.id] ? theme.good : theme.dim}>{day.habits[h.id] ? "■ " : "□ "}</Text>
              <Text color={theme.fg}>{h.name}</Text>
            </Text>
          ))}
        </Panel>

        <Panel theme={theme} title="📋 Up next" right={doneToday ? `${doneToday} done today` : ""} flexGrow={1}>
          {openTasks.length === 0
            ? <Dim theme={theme}>No open tasks. Add some in tab 4.</Dim>
            : openTasks.slice(0, Math.max(1, height - 6 - (state.habits.length + 3) - 3)).map((t) => (
              <Text key={t.id} wrap="truncate-end">
                <Text color={theme.bad}>{PRIO[t.priority].padEnd(4)}</Text><Text color={theme.fg}>{t.text}</Text>
              </Text>
            ))}
        </Panel>
      </Box>
    </Box>
  );
}
