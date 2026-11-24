import React from "react";
import {Box, Text} from "ink";
import {LOG_KINDS} from "../../lib/model.js";

const SECTIONS = [
  ["Global", [["1-6 / tab", "switch view"], [",", "cycle theme"], ["?", "toggle this help"], ["q", "quit (logs a running focus block)"]]],
  ["Today", [["a", "quick log — prefix with til: win: blocker: bug: idea:"], ["m / n", "set mood / energy (1-5)"], ["e", "open today's journal in $EDITOR"], ["u", "undo last log"], ["g", "refresh today's git commits"], ["s", "start a focus block"]]],
  ["Journal", [["↑↓ / j k", "pick a day"], ["enter / e", "edit that day in $EDITOR"], ["/", "full-text search"], ["J / K", "scroll the preview"], ["t", "jump to today"]]],
  ["Focus", [["space", "start / pause"], ["l", "label what you're working on"], ["f", "finish early and log it"], ["n", "skip phase (no log)"], ["+ / -", "add / remove a minute"], ["r", "reset cycle"]]],
  ["Tasks", [["a", "add (!, !!, !!! = priority; #tags)"], ["x / space", "toggle done"], ["p", "cycle priority"], ["enter", "focus on task"], ["d", "delete"], ["h", "hide/show done"]]],
  ["Habits", [["↑↓", "pick habit"], ["←→", "pick day (backfill)"], ["x / space", "toggle"], ["a / d", "add / delete habit"]]],
];

export default function Help({theme}) {
  return (
    <Box flexDirection="row" flexWrap="wrap" paddingX={1}>
      {SECTIONS.map(([title, keys]) => (
        <Box key={title} flexDirection="column" width={48} marginBottom={1}>
          <Text bold color={theme.accent}>{title}</Text>
          {keys.map(([k, d]) => (
            <Text key={k}><Text color={theme.warn}>{k.padEnd(11)}</Text><Text color={theme.fg}>{d}</Text></Text>
          ))}
        </Box>
      ))}
      <Box flexDirection="column" width={48}>
        <Text bold color={theme.accent}>Log kinds</Text>
        <Text color={theme.fg}>{Object.entries(LOG_KINDS).map(([k, v]) => `${v.icon} ${k}`).join("  ")}</Text>
        <Text color={theme.dim}>Data lives in ~/.devlog (DEVLOG_HOME to override).</Text>
      </Box>
    </Box>
  );
}
