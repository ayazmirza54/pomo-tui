import {dayKey, clock} from "../../src/lib/dates.js";

/** Your public pushes for day `k`, from GitHub's events API (no token needed). */
export async function githubPushesOn(user, k) {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=100`,
    {headers: {Accept: "application/vnd.github+json"}});
  if (res.status === 404) throw new Error(`No GitHub user called “${user}”.`);
  if (res.status === 403) throw new Error("GitHub rate limit reached. Try again in a few minutes.");
  if (!res.ok) throw new Error(`GitHub returned ${res.status}.`);
  const events = await res.json();
  const out = [];
  for (const e of events) {
    if (e.type !== "PushEvent" || dayKey(new Date(e.created_at)) !== k) continue;
    const repo = e.repo.name.split("/")[1];
    const time = clock(new Date(e.created_at));
    const commits = e.payload?.commits || [];
    if (commits.length) for (const c of commits) out.push({hash: c.sha.slice(0, 7), subject: c.message.split("\n")[0], repo, time});
    else out.push({hash: (e.payload?.head || "").slice(0, 7), subject: `pushed to ${(e.payload?.ref || "").replace("refs/heads/", "")}`, repo, time});
  }
  return out.reverse();
}
