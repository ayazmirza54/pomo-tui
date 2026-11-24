import {getDay, sessionsOn, MOODS, dayHasActivity} from "../../src/lib/model.js";
import {addDays, prettyDate, fmtMinutes, clock} from "../../src/lib/dates.js";

const KIND = {note: "", win: "**win** ", til: "**TIL** ", blocker: "**blocker** ", bug: "**bug** ", idea: "**idea** "};

export function exportMarkdown(state, from, to) {
  const parts = [`# Devlog ${from} → ${to}`, ""];
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const d = getDay(state, k);
    const sessions = sessionsOn(state, k);
    const journal = (state.journal[k] || "").trim();
    if (!dayHasActivity(d) && !sessions.length && !journal) continue;
    parts.push(`## ${prettyDate(k, {year: "numeric"})}`, "");
    const meta = [];
    if (d.mood) meta.push(`mood ${MOODS[d.mood - 1].emoji} ${MOODS[d.mood - 1].label}`);
    if (d.energy) meta.push(`energy ${d.energy}/5`);
    const mins = sessions.reduce((a, x) => a + x.minutes, 0);
    if (mins) meta.push(`focus ${fmtMinutes(mins)} (${sessions.length} blocks)`);
    const habits = state.habits.filter((h) => d.habits?.[h.id]).map((h) => h.name);
    if (habits.length) meta.push(`habits: ${habits.join(", ")}`);
    if (meta.length) parts.push(`_${meta.join(" · ")}_`, "");
    for (const l of d.logs) parts.push(`- ${clock(new Date(l.t))} ${KIND[l.kind] || ""}${l.text}`);
    if (d.logs.length) parts.push("");
    if (journal) parts.push(journal.replace(/^(#+)/gm, "$1##"), "");
  }
  return parts.join("\n");
}
