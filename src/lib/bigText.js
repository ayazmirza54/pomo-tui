// 5x5 block digits from the original pomo-tui, with an underline row.
const PIX = process.env.ASCII_FALLBACK ? "#" : "█";
const BORDER = process.env.ASCII_FALLBACK ? "-" : "─";
const W = 5, H = 6;
const G = {
  0: "1111111011110111101111111", 1: "0001100011000110001100011",
  2: "1111100011111111100011111", 3: "1111100011111110001111111",
  4: "1101111011111110001100011", 5: "1111111000111110001111111",
  6: "1111111000111111101111111", 7: "1111100011000110001100011",
  8: "1111111011111111101111111", 9: "1111111011111110001111111",
};

function glyph(ch) {
  if (ch === ":") {
    const m = Array.from({length: H}, () => Array(4).fill(" "));
    m[1][1] = m[1][2] = m[3][1] = m[3][2] = PIX;
    return m;
  }
  const bits = G[ch] || G[0];
  const m = Array.from({length: H}, () => Array(W).fill(" "));
  [...bits].forEach((b, i) => { if (b === "1") m[(i / W) | 0][i % W] = PIX; });
  for (let x = 0; x < W; x++) m[H - 1][x] = BORDER;
  return m;
}

const scale = (m, s) => m.flatMap((row) => Array(s).fill(row.flatMap((c) => Array(s).fill(c))));

export function bigText(text, s = 1) {
  const mats = [...text].map((c) => scale(glyph(c), s));
  return Array.from({length: H * s}, (_, y) => mats.map((m) => m[y].join("")).join(" ".repeat(s)));
}
export const bigTextWidth = (text, s = 1) => bigText(text, s)[0].length;
