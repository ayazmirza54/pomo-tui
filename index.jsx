import React, {useEffect, useMemo, useState} from "react";
import {render, Box, Text, useInput} from "ink";

/* ───────────────── Alt screen & cursor ───────────────── */
const enterAlt = () => {
  process.stdout.write("\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H"); // alt buffer + hide cursor + clear
};
const exitAlt = () => {
  process.stdout.write("\x1b[?25h\x1b[?1049l"); // show cursor + leave alt buffer
};

/* ───────────────── Themes ───────────────── */
const THEMES = [
  {name:"Classic", fg:"#cbd5e1", accent:"#cbd5e1"},
  {name:"Cyber",   fg:"#d1fae5", accent:"#22d3ee"},
  {name:"Solar",   fg:"#fcd34d", accent:"#f59e0b"},
];

/* ──────────────── 5x5 bitmap + bottom border (your logic) ──────────────── */
const PIX = process.env.ASCII_FALLBACK ? "#" : "█";
const BORDER_CHAR = process.env.ASCII_FALLBACK ? "-" : "─";

const DIGIT_SIZE = 5;
const DIGIT_WIDTH = DIGIT_SIZE;
const DIGIT_HEIGHT = DIGIT_SIZE + 1; // + bottom border
const COLON_WIDTH = 4;                // includes padding
const DOT_WIDTH   = 4;
const DIGIT_SPACE_WIDTH = 1;

const D0 = [1,1,1,1,1, 1,1,0,1,1, 1,1,0,1,1, 1,1,0,1,1, 1,1,1,1,1];
const D1 = [0,0,0,1,1, 0,0,0,1,1, 0,0,0,1,1, 0,0,0,1,1, 0,0,0,1,1];
const D2 = [1,1,1,1,1, 0,0,0,1,1, 1,1,1,1,1, 1,1,0,0,0, 1,1,1,1,1];
const D3 = [1,1,1,1,1, 0,0,0,1,1, 1,1,1,1,1, 0,0,0,1,1, 1,1,1,1,1];
const D4 = [1,1,0,1,1, 1,1,0,1,1, 1,1,1,1,1, 0,0,0,1,1, 0,0,0,1,1];
const D5 = [1,1,1,1,1, 1,1,0,0,0, 1,1,1,1,1, 0,0,0,1,1, 1,1,1,1,1];
const D6 = [1,1,1,1,1, 1,1,0,0,0, 1,1,1,1,1, 1,1,0,1,1, 1,1,1,1,1];
const D7 = [1,1,1,1,1, 0,0,0,1,1, 0,0,0,1,1, 0,0,0,1,1, 0,0,0,1,1];
const D8 = [1,1,1,1,1, 1,1,0,1,1, 1,1,1,1,1, 1,1,0,1,1, 1,1,1,1,1];
const D9 = [1,1,1,1,1, 1,1,0,1,1, 1,1,1,1,1, 0,0,0,1,1, 1,1,1,1,1];
const DE = [1,1,1,1,1, 1,1,0,0,0, 1,1,1,1,0, 1,1,0,0,0, 1,1,1,1,1];
const MAP = {0:D0,1:D1,2:D2,3:D3,4:D4,5:D5,6:D6,7:D7,8:D8,9:D9,E:DE};

function scaleMatrix(mat, s){
  const H = mat.length, W = mat[0].length;
  const out = Array.from({length: H*s}, ()=>Array(W*s).fill(" "));
  for (let y=0;y<H;y++){
    for (let x=0;x<W;x++){
      const ch = mat[y][x];
      for (let yy=0; yy<s; yy++)
        for (let xx=0; xx<s; xx++)
          out[y*s+yy][x*s+xx] = ch;
    }
  }
  return out;
}
function digitMatrix(ch, withBorder, scale){
  if (ch === ":"){
    const W = COLON_WIDTH, H = DIGIT_HEIGHT;
    const m = Array.from({length:H}, ()=>Array(W).fill(" "));
    [[1,1],[2,1],[1,3],[2,3]].forEach(([x,y]) => { if (m[y]?.[x] !== undefined) m[y][x]=PIX; });
    return scaleMatrix(m, scale);
  }
  if (ch === "."){
    const W = DOT_WIDTH, H = DIGIT_HEIGHT;
    const m = Array.from({length:H}, ()=>Array(W).fill(" "));
    const y = H-2; [[1,y],[2,y]].forEach(([x,yy]) => { if (m[yy]?.[x] !== undefined) m[yy][x]=PIX; });
    return scaleMatrix(m, scale);
  }
  const pat = MAP.hasOwnProperty(ch) ? MAP[ch] : MAP.E;
  const H = DIGIT_HEIGHT, W = DIGIT_WIDTH;
  const m = Array.from({length:H}, ()=>Array(W).fill(" "));
  for (let i=0;i<pat.length;i++){
    const x = i % DIGIT_SIZE, y = (i / DIGIT_SIZE) | 0;
    if (pat[i] === 1) m[y][x] = PIX;
  }
  if (withBorder) for (let x=0;x<W;x++) m[H-1][x] = BORDER_CHAR;
  return scaleMatrix(m, scale);
}
function renderString(text, {withBorder=true, scale=1}){
  const mats = [...text].map(ch => digitMatrix(ch, withBorder, scale));
  const gap = " ".repeat(DIGIT_SPACE_WIDTH * scale);
  const height = Math.max(...mats.map(m => m.length));
  const rows = [];
  for (let y=0;y<height;y++){
    const parts = [];
    for (let i=0;i<mats.length;i++){
      const M = mats[i];
      const row = M[y] ? M[y].join("") : " ".repeat(M[0].length);
      parts.push(row);
      if (i !== mats.length - 1) parts.push(gap);
    }
    rows.push(parts.join(""));
  }
  return rows;
}

/* ───────────────── Helpers ───────────────── */
const fmt = (ms, deci=true) => {
  const total = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(total/60);
  const s = total % 60;
  const t = Math.floor((ms%1000)/100);
  return deci ? `${m}:${String(s).padStart(2,"0")}.${t}` : `${m}:${String(s).padStart(2,"0")}`;
};
const nowClock = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  const ss = String(d.getSeconds()).padStart(2,"0");
  return `${hh}:${mm}:${ss}`;
};
// emoji-safe-ish visible length + centered text helpers
const visLen = (s) => [...s].length;
const centerPad = (s, cols) => " ".repeat(Math.max(0, Math.floor((cols - visLen(s)) / 2)));
const centeredRule = (title, cols) => {
  const w = visLen(title);
  const space = 2;
  const side = Math.max(0, Math.floor((cols - w - space) / 2));
  return "─".repeat(side) + " " + title + " " + "─".repeat(Math.max(0, cols - w - space - side));
};

/* ───────────────── App ───────────────── */
const App = () => {
  // Screens: countdown | timer | pomodoro
  const [screen, setScreen] = useState("countdown");
  const [themeIdx,setThemeIdx] = useState(0);
  const theme = THEMES[themeIdx];

  // Flags
  const [showDeci, setShowDeci] = useState(true);
  const [showLocal, setShowLocal] = useState(true);
  const [running,setRunning] = useState(false);
  const [editMode,setEditMode] = useState(false);

  // Countdown
  const [cdInitial, setCdInitial] = useState(10*60*1000); // 10m default
  const [cdMs, setCdMs] = useState(cdInitial);

  // Timer (stopwatch)
  const [swMs, setSwMs] = useState(0);

  // Pomodoro
  const WORK=25*60*1000, SHORT=5*60*1000, LONG=15*60*1000, ROUNDS=4;
  const [phase,setPhase] = useState("WORK");
  const [round,setRound] = useState(1);
  const [pomoMs,setPomoMs] = useState(WORK);

  // Local clock
  const [clock,setClock] = useState(nowClock());

  // Fullscreen lifecycle + cleanup
  useEffect(()=>{
    enterAlt();
    const onExit = () => exitAlt();
    process.on("SIGINT", onExit);
    process.on("SIGTERM", onExit);
    process.on("exit", onExit);
    return ()=>{
      process.off("SIGINT", onExit);
      process.off("SIGTERM", onExit);
      process.off("exit", onExit);
      onExit();
    };
  },[]);

  // Live clock
  useEffect(()=>{
    const id = setInterval(()=> setClock(nowClock()), 250);
    return ()=>clearInterval(id);
  },[]);

  // Main tick @100ms
  useEffect(()=>{
    if(!running) return;
    const id = setInterval(()=>{
      if (screen==="countdown") setCdMs(v=> Math.max(0, v-100));
      else if (screen==="timer") setSwMs(v=> v+100);
      else setPomoMs(v=> Math.max(0, v-100));
    }, 100);
    return ()=>clearInterval(id);
  },[running, screen]);

  // Pomodoro transitions
  useEffect(()=>{
    if (screen!=="pomodoro" || pomoMs>0) return;
    if (phase==="WORK") setPhase((round%ROUNDS===0) ? "LONG" : "SHORT");
    else { setPhase("WORK"); setRound(r=>r+1); }
  },[pomoMs, screen]); // eslint-disable-line
  useEffect(()=>{
    if (screen!=="pomodoro") return;
    const next = phase==="WORK" ? WORK : phase==="SHORT" ? SHORT : LONG;
    setPomoMs(next);
  },[phase, screen]); // eslint-disable-line

  // Input
  useInput((input, key)=>{
    if (key.escape || input==='q') { exitAlt(); process.exit(0); }
    if (input===' ') setRunning(r=>!r);                 // start/pause
    if (input==='s') setRunning(true);
    if (input==='r'){                                   // reset current
      if (screen==="countdown") setCdMs(cdInitial);
      if (screen==="timer") setSwMs(0);
      if (screen==="pomodoro"){ setPhase("WORK"); setRound(1); setPomoMs(WORK); }
      setRunning(false);
    }
    if (input==='e') setEditMode(m=>!m);                // toggle edit mode
    if (key.ctrl && input==='e'){                       // align countdown to next 10m
      if (screen==="countdown"){
        const d = new Date();
        const mins = d.getMinutes();
        const next10 = (Math.floor(mins/10)+1)*10;
        const delta = (next10 - mins) % 60;
        const target = (delta===0?10:delta)*60*1000;
        setCdInitial(target); setCdMs(target);
      }
    }
    if (input===',') setThemeIdx(i=>(i+1)%THEMES.length);
    if (input==='.'){ setShowDeci(v=>!v); }
    if (input===':'){ setShowLocal(v=>!v); }
    if (input==='c') setScreen("countdown");
    if (input==='t') setScreen("timer");
    if (input==='p') setScreen("pomodoro");

    // Edit minutes vs regular nudge
    if (editMode){
      if (input==='+'){
        if (screen==="countdown"){ setCdInitial(v=>v+60_000); setCdMs(v=>v+60_000); }
        if (screen==="pomodoro" && phase==="WORK"){ setPomoMs(v=>v+60_000); }
      }
      if (input==='-'){
        if (screen==="countdown"){ setCdInitial(v=>Math.max(60_000, v-60_000)); setCdMs(v=>Math.max(60_000, v-60_000)); }
        if (screen==="pomodoro" && phase==="WORK"){ setPomoMs(v=>Math.max(60_000, v-60_000)); }
      }
    } else {
      if (input==='+'){
        if (screen==="countdown") setCdMs(v=>v+60_000);
        if (screen==="timer") setSwMs(v=>v+60_000);
        if (screen==="pomodoro") setPomoMs(v=>v+60_000);
      }
      if (input==='-'){
        if (screen==="countdown") setCdMs(v=>Math.max(10_000, v-60_000));
        if (screen==="timer") setSwMs(v=>Math.max(0, v-60_000));
        if (screen==="pomodoro") setPomoMs(v=>Math.max(10_000, v-60_000));
      }
    }
  });

  // Time string for active screen
  const timeStr =
    screen==="countdown" ? fmt(cdMs, showDeci) :
    screen==="timer"     ? fmt(swMs, showDeci) :
                           fmt(pomoMs, showDeci);

  // Scale: default 1 (override with env SCALE)
  const scale = Math.max(1, parseInt(process.env.SCALE||"1",10));
  const lines = useMemo(()=>renderString(timeStr, {withBorder:true, scale}), [timeStr, scale]);

  // Layout: 80% timer area, 20% controls, + 1 row top rule
  const cols = process.stdout.columns ?? 80;
  const rows = process.stdout.rows ?? 24;
  const bodyRows   = Math.max(1, rows - 1);
  const timerRows  = Math.max(3, Math.floor(bodyRows * 0.8));
  const controlRows= Math.max(1, bodyRows - timerRows);

  // Horizontal centering across full width (for big digits)
  const maxLen = Math.max(...lines.map(l=>l.length));
  const padLeft = Math.max(0, Math.floor((cols - maxLen) / 2));
  const pad = " ".repeat(padLeft);

  // Labels
  const status = running ? "▶" : "‖";
  const label =
    screen==="countdown" ? `⏳ COUNTDOWN  ${status}` :
    screen==="timer"     ? `⏱ TIMER  ${status}` :
                           `🍅 POMODORO  ${status}`;

  return (
    <Box width="100%" height="100%" flexDirection="column">
      {/* Top rule */}
      <Box height={1}><Text color={theme.accent}>{"".padEnd(cols,"─")}</Text></Box>

      {/* TIMER AREA (80%) */}
      <Box height={timerRows} flexDirection="column" justifyContent="center">
        {lines.map((l,i)=>(
          <Text key={i} color={theme.accent}>{pad}{l}</Text>
        ))}
        <Box marginTop={1}>
          <Text color={theme.fg}>{centerPad(label, cols)}{label}</Text>
        </Box>
      </Box>

      {/* CONTROLS AREA (20%) */}
      <Box height={controlRows} flexDirection="column" justifyContent="space-between">
        <Box>
          <Text color={theme.accent}>{centeredRule("[m]enu ↓", cols)}</Text>
        </Box>

        {(() => {
          const l1 = "screens    [c]ountdown   [t]imer   [p]omodoro";
          const l2 = "appearance [,]change style   [.]toggle deciseconds   [:]toggle local time";
          const l3 = "controls   [s]tart   [e]dit   [^e]dit by local time   [r]eset clock";
          return (
            <Box flexDirection="column">
              <Text color={theme.fg}>{centerPad(l1, cols)}{l1}</Text>
              <Text color={theme.fg}>{centerPad(l2, cols)}{l2}</Text>
              <Text color={theme.fg}>{centerPad(l3, cols)}{l3}</Text>
            </Box>
          );
        })()}

        {/* bottom-right local clock */}
        <Box>
          <Text>
            {"".padEnd(Math.max(0, cols - (showLocal ? nowClock().length+1 : 0)), " ")}
          </Text>
          {showLocal ? <Text color={theme.fg}>{nowClock()}</Text> : null}
        </Box>
      </Box>
    </Box>
  );
};

render(<App />);
