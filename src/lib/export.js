import {getDay, sessionsOn, LOG_KINDS, MOODS, dayHasActivity} from "./model.js";
import {readJournal, journalDays} from "./journal.js";
import {addDays, prettyDate, fmtMinutes, clock} from "./dates.js";

/** Markdown report for an inclusive date range. */
export function exportMarkdown(state, from, to) {
  const jdays = new Set(journalDays());
  const parts = [`# Devlog ${from} → ${to}`, ""];
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const d = getDay(state, k);
    const sessions = sessionsOn(state, k);
    const journal = jdays.has(k) ? readJournal(k).trim() : "";
    if (!dayHasActivity(d) && !sessions.length && !journal) continue;

    parts.push(`## ${prettyDate(k, {year: "numeric"})}`, "");
    const meta = [];
    if (d.mood) meta.push(`mood ${MOODS[d.mood - 1].emoji} ${MOODS[d.mood - 1].label}`);
    if (d.energy) meta.push(`energy ${d.energy}/5`);
    const mins = sessions.reduce((a, x) => a + x.minutes, 0);
    if (mins) meta.push(`focus ${fmtMinutes(mins)} (${sessions.length} 🍅)`);
    const habits = state.habits.filter((h) => d.habits?.[h.id]).map((h) => h.name);
    if (habits.length) meta.push(`habits: ${habits.join(", ")}`);
    if (meta.length) parts.push(`_${meta.join(" · ")}_`, "");

    if (d.logs.length) {
      for (const l of d.logs) parts.push(`- ${clock(new Date(l.t))} ${LOG_KINDS[l.kind]?.icon || "•"} ${l.text}`);
      parts.push("");
    }
    if (journal) {
      // demote the entry's own headings under the day heading
      parts.push(journal.replace(/^(#+)/gm, "$1##"), "");
    }
  }
  return parts.join("\n");
}
