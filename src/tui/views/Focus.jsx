import React from "react";
import {Box, Text, useInput} from "ink";
import {Dim, Bar} from "../ui.jsx";
import {bigText, bigTextWidth} from "../../lib/bigText.js";
import {sessionsOn} from "../../lib/model.js";
import {dayKey, clock, fmtMinutes} from "../../lib/dates.js";

export const fmtTimer = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const PHASE = {WORK: "🍅 FOCUS", SHORT: "☕ SHORT BREAK", LONG: "🌴 LONG BREAK"};

export default function Focus({state, timer, ask, theme, active, width, height, now}) {
  useInput((input) => {
    if (input === " ") timer.toggle();
    else if (input === "l") ask("working on", (v) => timer.setTask(v.trim()), timer.task);
    else if (input === "f") timer.finish();
    else if (input === "n") timer.skip();
    else if (input === "r") timer.reset();
    else if (input === "+" || input === "=") timer.adjust(1);
    else if (input === "-") timer.adjust(-1);
  }, {isActive: active});

  const text = fmtTimer(timer.remaining);
  const envScale = parseInt(process.env.SCALE || "", 10);
  const scale = envScale > 0 ? envScale
    : (bigTextWidth(text, 2) + 4 < width && height >= 26) ? 2 : 1;
  const lines = bigText(text, scale);
  const color = timer.phase === "WORK" ? theme.accent : theme.good;
  const k = dayKey(new Date(now));
  const sessions = sessionsOn(state, k);
  const total = sessions.reduce((a, x) => a + x.minutes, 0);
  const dots = Array.from({length: state.settings.rounds}, (_, i) => {
    const r = ((timer.round - 1) % state.settings.rounds);
    return i < r || (i === r && timer.phase !== "WORK") ? "●" : i === r ? "◉" : "○";
  }).join(" ");
  const barW = Math.min(60, width - 10);
  const listRows = Math.max(0, height - lines.length - 9);

  return (
    <Box flexDirection="column" height={height} alignItems="center" justifyContent="center">
      <Text bold color={color}>{PHASE[timer.phase]}  <Text color={theme.dim}>{timer.running ? "▶ running" : timer.startedAt ? "‖ paused" : "space to start"}</Text></Text>
      <Text> </Text>
      {lines.map((l, i) => <Text key={i} color={color}>{l}</Text>)}
      <Text> </Text>
      <Bar theme={theme} color={color} value={timer.elapsed} max={timer.phaseLen} width={barW} />
      <Text>
        <Dim theme={theme}>round </Dim><Text color={theme.fg}>{dots}</Text>
        <Dim theme={theme}>   on: </Dim><Text color={theme.warn}>{timer.task || "(press l to label)"}</Text>
      </Text>
      <Text> </Text>
      <Text><Dim theme={theme}>today </Dim><Text bold color={theme.accent}>{fmtMinutes(total)}</Text><Dim theme={theme}> in {sessions.length} blocks</Dim></Text>
      {sessions.slice(-listRows).reverse().map((x) => (
        <Text key={x.id} color={theme.dim} wrap="truncate-end">
          {clock(new Date(x.start))}–{clock(new Date(x.end))}  {String(x.minutes).padStart(3)}m  {x.task || "—"}
        </Text>
      ))}
    </Box>
  );
}
