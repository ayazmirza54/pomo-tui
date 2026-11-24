import React, {useMemo} from "react";
import {Box, Text} from "ink";
import {Panel, Dim, Bar} from "../ui.jsx";
import {focusByDay, activeDays, currentStreak, longestStreak, getDay, LOG_KINDS, MOODS} from "../../lib/model.js";
import {dayKey, addDays, lastNDays, weekdayIdx, parseKey, fmtMinutes} from "../../lib/dates.js";
import {journalDays} from "../../lib/journal.js";

const SHADES = ["·", "░", "▒", "▓", "█"];
export const level = (m) => (!m ? 0 : m < 25 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4);

/** GitHub-style grid: 7 rows (Mon..Sun) × `weeks` columns ending this week. */
export function heatmap(byDay, weeks, today) {
  const start = addDays(today, -weekdayIdx(today) - (weeks - 1) * 7);
  const grid = Array.from({length: 7}, (_, r) =>
    Array.from({length: weeks}, (_, c) => {
      const k = addDays(start, c * 7 + r);
      return k > today ? null : level(byDay[k] || 0);
    }));
  const months = Array(weeks * 2).fill(" ");
  let prevMonth = -1;
  for (let c = 0; c < weeks; c++) {
    const m = parseKey(addDays(start, c * 7)).getMonth();
    if (m !== prevMonth && c * 2 + 3 <= months.length) {
      [..."JanFebMarAprMayJunJulAugSepOctNovDec".slice(m * 3, m * 3 + 3)].forEach((ch, i) => { months[c * 2 + i] = ch; });
      prevMonth = m;
    }
  }
  return {grid, months: months.join("")};
}

const SPARK = "▁▂▄▆█";

export default function Stats({state, theme, width, height, fsVersion, now}) {
  const today = dayKey(new Date(now));
  const data = useMemo(() => {
    const byDay = focusByDay(state);
    const active = activeDays(state, journalDays());
    const week = lastNDays(7, today);
    const sum = (keys) => keys.reduce((a, k) => a + (byDay[k] || 0), 0);
    const weekStart = new Date(parseKey(week[0])).getTime();
    const byTask = {};
    for (const s of state.sessions) if (s.start >= weekStart) byTask[s.task || "(unlabelled)"] = (byTask[s.task || "(unlabelled)"] || 0) + s.minutes;
    const monthKeys = lastNDays(30, today);
    const kinds = {};
    for (const k of monthKeys) for (const l of getDay(state, k).logs) kinds[l.kind] = (kinds[l.kind] || 0) + 1;
    const moods = monthKeys.map((k) => getDay(state, k).mood);
    const rated = moods.filter(Boolean);
    return {
      byDay, week,
      todayMin: byDay[today] || 0, weekMin: sum(week), prevWeekMin: sum(lastNDays(7, addDays(today, -7))),
      allMin: Object.values(byDay).reduce((a, b) => a + b, 0),
      streak: currentStreak(active, today), best: longestStreak(active), activeTotal: active.size,
      tasksWeek: state.tasks.filter((t) => t.done && t.doneAt >= weekStart).length,
      topTasks: Object.entries(byTask).sort((a, b) => b[1] - a[1]).slice(0, 5),
      kinds, moods, avgMood: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
      journals: journalDays().length,
    };
  }, [state, today, fsVersion]);

  const weeks = Math.max(8, Math.min(53, Math.floor((width - 10) / 2)));
  const {grid, months} = heatmap(data.byDay, weeks, today);
  const delta = data.prevWeekMin ? Math.round(((data.weekMin - data.prevWeekMin) / data.prevWeekMin) * 100) : null;
  const colW = Math.floor((width - 2) / 3);
  const maxTask = data.topTasks[0]?.[1] || 1;
  const heatColor = [theme.border, theme.dim, theme.fg, theme.accent, theme.accent];

  return (
    <Box flexDirection="column" height={height}>
      <Panel theme={theme} title="🟩 Focus heatmap" flexShrink={0} right={`${fmtMinutes(data.allMin)} all-time`}>
        <Text color={theme.dim}>{"     " + months}</Text>
        {grid.map((row, r) => (
          <Text key={r}>
            <Dim theme={theme}>{["Mon ", "    ", "Wed ", "    ", "Fri ", "    ", "Sun "][r]} </Dim>
            {row.map((v, c) => <Text key={c} color={v == null ? undefined : heatColor[v]}>{v == null ? "  " : SHADES[v] + " "}</Text>)}
          </Text>
        ))}
        <Text><Dim theme={theme}>     less </Dim>{SHADES.map((s, i) => <Text key={i} color={heatColor[i]}>{s} </Text>)}<Dim theme={theme}>more   (·0 ░&lt;25m ▒&lt;1h ▓&lt;2h █2h+)</Dim></Text>
      </Panel>

      <Box flexDirection="row" flexGrow={1} flexShrink={1} overflow="hidden">
        <Panel theme={theme} title="📈 Numbers" width={colW}>
          <Text color={theme.fg}>today      <Text bold color={theme.accent}>{fmtMinutes(data.todayMin)}</Text></Text>
          <Text color={theme.fg}>this week  <Text bold color={theme.accent}>{fmtMinutes(data.weekMin)}</Text>
            {delta != null && <Text color={delta >= 0 ? theme.good : theme.bad}> {delta >= 0 ? "▲" : "▼"}{Math.abs(delta)}%</Text>}</Text>
          <Text color={theme.fg}>streak     <Text bold color={theme.warn}>🔥 {data.streak}d</Text><Dim theme={theme}> (best {data.best})</Dim></Text>
          <Text color={theme.fg}>active     {data.activeTotal}d · {data.journals} ✎</Text>
          <Text color={theme.fg}>tasks/wk   <Text color={theme.good}>{data.tasksWeek} done</Text></Text>
        </Panel>
        <Panel theme={theme} title="🎯 Focus by task (7d)" width={colW}>
          {data.topTasks.length === 0 && <Dim theme={theme}>No focus blocks this week.</Dim>}
          {data.topTasks.map(([t, m]) => (
            <Box key={t} flexDirection="column">
              <Text color={theme.fg} wrap="truncate-end">{t} <Dim theme={theme}>{fmtMinutes(m)}</Dim></Text>
              <Bar theme={theme} value={m} max={maxTask} width={Math.max(4, colW - 4)} />
            </Box>
          ))}
        </Panel>
        <Panel theme={theme} title="🧠 Last 30 days" width={width - colW * 2}>
          <Text>
            <Dim theme={theme}>mood </Dim>
            {data.moods.map((m, i) => <Text key={i} color={m ? (m >= 4 ? theme.good : m <= 2 ? theme.bad : theme.warn) : theme.border}>{m ? SPARK[m - 1] : "·"}</Text>)}
          </Text>
          <Dim theme={theme}>avg {data.avgMood ? `${data.avgMood.toFixed(1)} ${MOODS[Math.round(data.avgMood) - 1].emoji}` : "—"}</Dim>
          <Text> </Text>
          {Object.entries(LOG_KINDS).map(([k, v]) => (
            <Text key={k} color={theme.fg}>{v.icon} {v.label.padEnd(8)}<Text bold>{data.kinds[k] || 0}</Text></Text>
          ))}
        </Panel>
      </Box>
    </Box>
  );
}
