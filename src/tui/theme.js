export const THEMES = [
  {name: "Midnight", fg: "#cbd5e1", accent: "#7dd3fc", dim: "#64748b", border: "#334155", good: "#4ade80", warn: "#fbbf24", bad: "#f87171"},
  {name: "Cyber",    fg: "#d1fae5", accent: "#22d3ee", dim: "#5f9ea0", border: "#155e75", good: "#a3e635", warn: "#facc15", bad: "#fb7185"},
  {name: "Solar",    fg: "#fde68a", accent: "#f59e0b", dim: "#a8a29e", border: "#78350f", good: "#84cc16", warn: "#fb923c", bad: "#ef4444"},
  {name: "Classic",  fg: "#cbd5e1", accent: "#cbd5e1", dim: "#94a3b8", border: "#475569", good: "#cbd5e1", warn: "#cbd5e1", bad: "#cbd5e1"},
];
export const themeOf = (settings) => THEMES[(settings.theme || 0) % THEMES.length];
