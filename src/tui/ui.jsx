import React, {useState} from "react";
import {Box, Text, useInput} from "ink";

export function Prompt({label, initial = "", onSubmit, onCancel, theme}) {
  const [v, setV] = useState(initial);
  useInput((input, key) => {
    if (key.return) return onSubmit(v);
    if (key.escape) return onCancel();
    if (key.backspace || key.delete) return setV((x) => [...x].slice(0, -1).join(""));
    if (key.ctrl && input === "u") return setV("");
    if (key.ctrl || key.meta || key.tab || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) return;
    if (!input) return;
    // Pasted / fast-typed chunks can carry the Enter inside them.
    const nl = input.search(/[\r\n]/);
    if (nl >= 0) return onSubmit(v + input.slice(0, nl).replace(/\t/g, " "));
    setV((x) => x + input.replace(/\t/g, " "));
  });
  return (
    <Box>
      <Text color={theme.accent} bold>{label} › </Text>
      <Text color={theme.fg}>{v}</Text>
      <Text inverse> </Text>
    </Box>
  );
}

export function Panel({title, right, theme, children, ...box}) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.border} paddingX={1} overflow="hidden" {...box}>
      <Box justifyContent="space-between" flexShrink={0}>
        <Text bold color={theme.accent} wrap="truncate-end">{title}</Text>
        {right ? <Text color={theme.dim}>{right}</Text> : null}
      </Box>
      {/* flexShrink=0: on short terminals content clips at the border instead of rows overlapping */}
      <Box flexDirection="column" flexShrink={0}>{children}</Box>
    </Box>
  );
}

export const Dim = ({theme, children, ...p}) => <Text color={theme.dim} {...p}>{children}</Text>;

export const Bar = ({value, max, width, theme, color}) => {
  const n = max > 0 ? Math.max(0, Math.min(width, Math.round((value / max) * width))) : 0;
  return (
    <Text>
      <Text color={color || theme.accent}>{"━".repeat(n)}</Text>
      <Text color={theme.border}>{"━".repeat(width - n)}</Text>
    </Text>
  );
};

/** Keep the cursor row visible inside a window of `height` rows. */
export const windowAround = (len, cursor, height) => {
  if (len <= height) return [0, len];
  const start = Math.max(0, Math.min(len - height, cursor - Math.floor(height / 2)));
  return [start, start + height];
};
