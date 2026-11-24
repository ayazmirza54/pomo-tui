import React, {useMemo, useState} from "react";
import {Box, Text, useInput} from "ink";
import {Panel, Dim, windowAround} from "../ui.jsx";
import {getDay, dayHasActivity, sessionsOn, LOG_KINDS, MOODS, moodEmoji} from "../../lib/model.js";
import {dayKey, prettyDate, clock, fmtMinutes} from "../../lib/dates.js";
import {journalDays, readJournal, ensureJournal} from "../../lib/journal.js";

function mdLine(line, theme, i) {
  if (/^#{1,6}\s/.test(line)) return <Text key={i} bold color={theme.accent} wrap="truncate-end">{line.replace(/^#+\s*/, "")}</Text>;
  if (/^>\s?/.test(line)) return <Text key={i} italic color={theme.dim} wrap="truncate-end">│ {line.replace(/^>\s?/, "")}</Text>;
  if (/^\s*[-*]\s\[[ xX]\]/.test(line)) {
    const done = /\[[xX]\]/.test(line);
    return <Text key={i} color={done ? theme.good : theme.fg} wrap="truncate-end">{line.replace(/^(\s*)[-*]\s\[[ xX]\]/, done ? "$1■" : "$1□")}</Text>;
  }
  if (/^\s*[-*]\s/.test(line)) return <Text key={i} color={theme.fg} wrap="truncate-end">{line.replace(/^(\s*)[-*]\s/, "$1• ")}</Text>;
  if (/^```/.test(line)) return <Text key={i} color={theme.border}>{"─".repeat(20)}</Text>;
  return <Text key={i} color={theme.fg} wrap="truncate-end">{line || " "}</Text>;
}

export default function Journal({state, ask, say, theme, active, openEditor, width, height, fsVersion, now}) {
  const today = dayKey(new Date(now));
  const [cursor, setCursor] = useState(0);
  const [scroll, setScroll] = useState(0);
  const [query, setQuery] = useState("");

  const allDays = useMemo(() => {
    const set = new Set([today, ...journalDays()]);
    for (const [k, d] of Object.entries(state.days)) if (dayHasActivity(d)) set.add(k);
    for (const x of state.sessions) set.add(dayKey(new Date(x.start)));
    return [...set].sort().reverse();
  }, [state, fsVersion, today]);

  const days = useMemo(() => {
    if (!query) return allDays;
    const q = query.toLowerCase();
    return allDays.filter((k) =>
      readJournal(k).toLowerCase().includes(q) ||
      getDay(state, k).logs.some((l) => l.text.toLowerCase().includes(q)));
  }, [allDays, query, state, fsVersion]);

  const sel = days[Math.min(cursor, days.length - 1)];
  const move = (d) => { setCursor((c) => Math.max(0, Math.min(days.length - 1, c + d))); setScroll(0); };

  useInput((input, key) => {
    if (key.downArrow || input === "j") move(1);
    else if (key.upArrow || input === "k") move(-1);
    else if (key.pageDown) move(10);
    else if (key.pageUp) move(-10);
    else if (input === "J") setScroll((s) => s + 3);
    else if (input === "K") setScroll((s) => Math.max(0, s - 3));
    else if (input === "t") { setQuery(""); setCursor(0); setScroll(0); }
    else if (input === "/") ask("search", (q) => { setQuery(q.trim()); setCursor(0); setScroll(0); }, query);
    else if (key.escape && query) { setQuery(""); setCursor(0); }
    else if ((key.return || input === "e") && sel) openEditor(ensureJournal(sel));
  }, {isActive: active});

  const listW = 30;
  const listRows = height - 3;
  const [from, to] = windowAround(days.length, cursor, listRows);

  // Build the preview for the selected day
  const preview = [];
  if (sel) {
    const d = getDay(state, sel);
    const sessions = sessionsOn(state, sel);
    const mins = sessions.reduce((a, x) => a + x.minutes, 0);
    const meta = [
      d.mood ? `${MOODS[d.mood - 1].emoji} ${MOODS[d.mood - 1].label}` : null,
      d.energy ? `⚡${d.energy}/5` : null,
      mins ? `🍅 ${fmtMinutes(mins)}` : null,
      `${state.habits.filter((h) => d.habits[h.id]).length}/${state.habits.length} habits`,
    ].filter(Boolean).join("   ");
    preview.push(<Text key="meta" color={theme.warn}>{meta}</Text>, <Text key="sp"> </Text>);
    for (const [i, l] of d.logs.entries())
      preview.push(<Text key={`l${i}`} wrap="truncate-end"><Dim theme={theme}>{clock(new Date(l.t))} </Dim>{LOG_KINDS[l.kind]?.icon} <Text color={theme.fg}>{l.text}</Text></Text>);
    if (d.logs.length) preview.push(<Text key="sp2"> </Text>);
    const body = readJournal(sel);
    if (body) body.split("\n").forEach((line, i) => preview.push(mdLine(line, theme, `m${i}`)));
    else preview.push(<Dim key="empty" theme={theme}>No journal entry. Press enter to write one in $EDITOR.</Dim>);
  }
  const maxScroll = Math.max(0, preview.length - (height - 3));
  const shown = preview.slice(Math.min(scroll, maxScroll), Math.min(scroll, maxScroll) + height - 3);

  return (
    <Box flexDirection="row" height={height}>
      <Panel theme={theme} title={query ? `🔎 “${query}”` : "📓 Entries"} right={`${days.length}`} width={listW}>
        {days.length === 0 && <Dim theme={theme}>No matches (esc to clear)</Dim>}
        {days.slice(from, to).map((k, i) => {
          const d = getDay(state, k);
          const isSel = from + i === cursor;
          return (
            <Text key={k} inverse={isSel && active} color={k === today ? theme.accent : theme.fg} wrap="truncate-end">
              {isSel ? "▸" : " "}{prettyDate(k, {year: "2-digit"}).padEnd(17)} {moodEmoji(d.mood)} {d.logs.length ? `${d.logs.length}` : ""}
            </Text>
          );
        })}
      </Panel>
      <Panel theme={theme} title={sel ? prettyDate(sel, {year: "numeric", month: "long"}) : ""} right={maxScroll ? `${Math.min(scroll, maxScroll)}/${maxScroll}` : ""} width={width - listW}>
        {shown}
      </Panel>
    </Box>
  );
}
