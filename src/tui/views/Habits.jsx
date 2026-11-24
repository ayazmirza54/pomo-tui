import React, {useState} from "react";
import {Box, Text, useInput} from "ink";
import {Panel, Dim} from "../ui.jsx";
import {toggleHabit, addHabit, removeHabit, habitDays, currentStreak, longestStreak} from "../../lib/model.js";
import {dayKey, lastNDays, parseKey, prettyDate} from "../../lib/dates.js";

export default function Habits({state, update, ask, say, theme, active, width, height, now}) {
  const today = dayKey(new Date(now));
  const nameW = Math.min(28, Math.max(16, ...state.habits.map((h) => h.name.length + 2)));
  const nCols = Math.max(7, Math.min(42, Math.floor((width - nameW - 22) / 2)));
  const days = lastNDays(nCols, today);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(nCols - 1);
  const c = Math.min(col, nCols - 1);
  const habit = state.habits[Math.min(row, state.habits.length - 1)];

  useInput((input, key) => {
    if (key.downArrow || input === "j") setRow((r) => Math.min(state.habits.length - 1, r + 1));
    else if (key.upArrow || input === "k") setRow((r) => Math.max(0, r - 1));
    else if (key.leftArrow || input === "h") setCol(() => Math.max(0, c - 1));
    else if (key.rightArrow || input === "l") setCol(() => Math.min(nCols - 1, c + 1));
    else if (input === "a") ask("new habit", (v) => { if (v.trim()) { update((s) => addHabit(s, v)); say("Habit added"); } });
    else if (!habit) return;
    else if (input === "x" || input === " ") update((s) => toggleHabit(s, days[c], habit.id));
    else if (input === "d") ask(`delete “${habit.name}”? (y/N)`, (v) => {
      if (/^y/i.test(v)) { update((s) => removeHabit(s, habit.id)); setRow((r) => Math.max(0, r - 1)); say("Habit deleted"); }
    });
  }, {isActive: active});

  const header = days.map((k) => "MTWTFSS"[(parseKey(k).getDay() + 6) % 7]).join(" ");

  return (
    <Panel theme={theme} title="✅ Habits" right={`selected: ${prettyDate(days[c])}`} height={height}>
      <Text>
        <Text>{" ".repeat(nameW)}</Text>
        <Dim theme={theme}>{header}</Dim>
        <Dim theme={theme}>   streak  best   30d</Dim>
      </Text>
      {state.habits.length === 0 && <Dim theme={theme}>No habits. Press a to add one.</Dim>}
      {state.habits.map((h, r) => {
        const set = habitDays(state, h.id);
        const last30 = lastNDays(30, today).filter((k) => set.has(k)).length;
        const isRow = r === row && active;
        return (
          <Text key={h.id} wrap="truncate-end">
            <Text color={isRow ? theme.accent : theme.fg} bold={isRow}>{(isRow ? "▸ " : "  ") + h.name.slice(0, nameW - 3).padEnd(nameW - 2)}</Text>
            {days.map((k, i) => (
              <Text key={k} inverse={isRow && i === c} color={set.has(k) ? theme.good : theme.border}>
                {set.has(k) ? "■" : "·"}{i < days.length - 1 ? " " : ""}
              </Text>
            ))}
            <Text color={theme.warn}>{`   🔥${String(currentStreak(set, today)).padEnd(5)}`}</Text>
            <Dim theme={theme}>{String(longestStreak(set)).padEnd(6)}{Math.round((last30 / 30) * 100)}%</Dim>
          </Text>
        );
      })}
      <Box marginTop={1}>
        <Dim theme={theme}>Small daily reps compound. Use ←→ to backfill days you forgot to tick.</Dim>
      </Box>
    </Panel>
  );
}
