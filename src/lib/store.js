// Persistence: ~/.devlog/data.json (+ journal/*.md). Override with DEVLOG_HOME.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {emptyState, migrate} from "./model.js";

export const devlogHome = () => process.env.DEVLOG_HOME || path.join(os.homedir(), ".devlog");
export const dataFile = () => path.join(devlogHome(), "data.json");
export const journalDir = () => path.join(devlogHome(), "journal");

export const ensureDirs = () => fs.mkdirSync(journalDir(), {recursive: true});

export function load() {
  ensureDirs();
  let text;
  try { text = fs.readFileSync(dataFile(), "utf8"); }
  catch (e) { if (e.code === "ENOENT") return emptyState(); throw e; }
  try { return migrate(JSON.parse(text)); }
  catch (e) { throw new Error(`Could not parse ${dataFile()}: ${e.message}`); }
}

/** Atomic write; returns the new mtime so watchers can ignore their own writes. */
export function save(state) {
  ensureDirs();
  const f = dataFile();
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  fs.renameSync(tmp, f);
  return mtime();
}

export const mtime = () => { try { return fs.statSync(dataFile()).mtimeMs; } catch { return 0; } };

export function mutate(fn) {
  const next = fn(load());
  save(next);
  return next;
}
