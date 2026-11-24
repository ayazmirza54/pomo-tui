import {execFile} from "node:child_process";
import {promisify} from "node:util";
import path from "node:path";

const run = promisify(execFile);
const git = async (args) => (await run("git", args, {timeout: 5000, maxBuffer: 4 << 20})).stdout;

export async function repoRoot(dir) {
  try { return (await git(["-C", dir, "rev-parse", "--show-toplevel"])).trim(); }
  catch { return null; }
}

export async function defaultAuthor() {
  try { return (await git(["config", "user.email"])).trim(); } catch { return ""; }
}

/** Configured repos, or the current repo if none configured. */
export async function resolveRepos(settings, cwd = process.cwd()) {
  if (settings.repos?.length) return settings.repos;
  const root = await repoRoot(cwd);
  return root ? [root] : [];
}

/** Your commits across all branches of `repos` on local day `k`. */
export async function commitsOn(k, {repos, author}) {
  author = author || (await defaultAuthor());
  const seen = new Set();
  const out = [];
  await Promise.all(repos.map(async (repo) => {
    const args = ["-C", repo, "log", "--all", "--no-merges",
      `--since=${k} 00:00:00`, `--until=${k} 23:59:59`,
      "--date=format-local:%H:%M", "--pretty=format:%h%x1f%ad%x1f%s"];
    if (author) args.push(`--author=${author}`);
    let text = "";
    try { text = await git(args); } catch { return; }
    for (const line of text.split("\n").filter(Boolean)) {
      const [hash, time, subject] = line.split("\x1f");
      const key = `${repo}:${hash}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({hash, time, subject, repo: path.basename(repo)});
    }
  }));
  return out.sort((a, b) => a.time.localeCompare(b.time));
}
