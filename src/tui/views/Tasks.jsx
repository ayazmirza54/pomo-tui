import React, {useState} from "react";
import {Box, Text, useInput} from "ink";
import {Panel, Dim, windowAround} from "../ui.jsx";
import {addTask, toggleTask, cyclePriority, removeTask, sortedTasks, tagsOf} from "../../lib/model.js";
import {dayKey, prettyDate} from "../../lib/dates.js";

const PRIO = [["   ", "dim"], ["!  ", "fg"], ["!! ", "warn"], ["!!!", "bad"]];

function TaskText({text, theme, done}) {
  const parts = text.split(/(#[\w-]+)/g);
  return parts.map((p, i) => (
    <Text key={i} color={p.startsWith("#") ? theme.accent : done ? theme.dim : theme.fg} strikethrough={done && !p.startsWith("#")}>{p}</Text>
  ));
}

export default function Tasks({state, update, ask, say, theme, active, timer, setTab, height}) {
  const [cursor, setCursor] = useState(0);
  const [hideDone, setHideDone] = useState(false);
  const list = sortedTasks(state.tasks).filter((t) => !(hideDone && t.done));
  const cur = list[Math.min(cursor, list.length - 1)];

  useInput((input, key) => {
    if (key.downArrow || input === "j") setCursor((c) => Math.min(list.length - 1, c + 1));
    else if (key.upArrow || input === "k") setCursor((c) => Math.max(0, c - 1));
    else if (input === "h") setHideDone((h) => !h);
    else if (input === "a") ask("task (!/!!/!!! priority, #tag)", (v) => { if (v.trim()) { update((s) => addTask(s, v)); say("Task added"); } });
    else if (!cur) return;
    else if (input === "x" || input === " ") { update((s) => toggleTask(s, cur.id)); if (!cur.done) say(`✓ ${cur.text}`); }
    else if (input === "p") update((s) => cyclePriority(s, cur.id));
    else if (input === "d") { update((s) => removeTask(s, cur.id)); say(`Deleted “${cur.text}”`); setCursor((c) => Math.max(0, c - 1)); }
    else if (key.return && !cur.done) { timer.setTask(cur.text); setTab("focus"); say(`Focus target: ${cur.text}`); }
  }, {isActive: active});

  const open = state.tasks.filter((t) => !t.done).length;
  const rows = height - 3;
  const [from, to] = windowAround(list.length, cursor, rows);
  const allTags = [...new Set(state.tasks.filter((t) => !t.done).flatMap((t) => tagsOf(t.text)))];

  return (
    <Panel theme={theme} title="📋 Tasks" right={`${open} open · ${state.tasks.length - open} done${allTags.length ? " · " + allTags.join(" ") : ""}`} height={height}>
      {list.length === 0 && <Dim theme={theme}>No tasks. Press a to add one — “!! fix login redirect #auth”.</Dim>}
      {list.slice(from, to).map((t, i) => {
        const [mark, c] = PRIO[t.priority || 0];
        return (
          <Box key={t.id} justifyContent="space-between">
            <Text inverse={active && from + i === cursor} wrap="truncate-end">
              <Text color={t.done ? theme.good : theme.dim}>{t.done ? " ■ " : " □ "}</Text>
              <Text color={theme[c]}>{mark} </Text>
              <TaskText text={t.text} theme={theme} done={t.done} />
            </Text>
            <Dim theme={theme}>{t.done ? `done ${prettyDate(dayKey(new Date(t.doneAt)))}` : ""}</Dim>
          </Box>
        );
      })}
    </Panel>
  );
}
