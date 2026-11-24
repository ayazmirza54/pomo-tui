# devlog

A developer's diary, journal and productivity tracker for the terminal.
It combines a daily journal with mood tracking, quick logs, git-aware commit recaps,
tasks, habit streaks and a pomodoro focus timer (carried over from `pomo-tui`), all
stored as plain JSON and Markdown that you own.

```
 ◆ devlog   1 Today  2 Journal  3 Focus  4 Tasks  5 Habits  6 Stats                           06:10
────────────────────────────────────────────────────────────────────────────────────────────────────
╭────────────────────────────────────────────────────────────╮╭────────────────────────────────────╮
│ 📅 Tue, Nov 24, 2026                      🔥 1 day streak  ││ 🍅 Focus                  2 blocks │
│ mood 🙂 good    energy ▮▮▮▯▯    journal not yet (e)        ││ 1h 15m today · goal 3h 20m         │
│ 💭 What question do you wish you had asked earlier?        ││ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
╰────────────────────────────────────────────────────────────╯│ s to start a block                 │
╭────────────────────────────────────────────────────────────╮╰────────────────────────────────────╯
│ ⚡ Quick log                                       4 today  │╭────────────────────────────────────╮
│ 10:00 🏆 merged the auth refactor PR                       ││ ✅ Habits                       2/5 │
│ 11:00 💡 git worktree lets you check out two branches at o…││ ■ Ship a commit                    │
│ 13:00 🧱 CI flaky on the e2e suite                         ││ □ Review a PR                      │
│ 15:00 ✨ cache the schema in a build step                   ││ ■ Learn something (30m)            │
│                                                            ││ □ Deep-work block                  │
│                                                            ││ □ Move / exercise                  │
│                                                            │╰────────────────────────────────────╯
│                                                            │╭────────────────────────────────────╮
╰────────────────────────────────────────────────────────────╯│ 📋 Up next                         │
╭────────────────────────────────────────────────────────────╮│ !!! fix login redirect loop #auth  │
│ 🔀 Commits today                                        0  ││ !!  write ADR for job queue #arch  │
│ No commits yet today.                                      ││     bump node to 22                │
╰────────────────────────────────────────────────────────────╯╰────────────────────────────────────╯
```

## Install

```sh
git clone https://github.com/ayazmirza54/pomo-tui && cd pomo-tui
npm install          # also builds dist/devlog.js
npm link             # puts `devlog` on your PATH
devlog               # open the TUI
```

Or run from source with `npm start`. Requires Node 20+.

## Views

| Key | View | What it's for |
|---|---|---|
| `1` | **Today** | Mood and energy, a daily reflection prompt, quick log, today's git commits, focus total, habit checklist, top tasks |
| `2` | **Journal** | Every day you've logged, with mood. Full-text search (`/`). `enter` opens that day's Markdown entry in `$EDITOR` |
| `3` | **Focus** | Pomodoro timer with big digits. Label what you're working on; completed blocks are logged automatically |
| `4` | **Tasks** | Priorities (`!`, `!!`, `!!!`) and `#tags`. `enter` sends a task to the focus timer |
| `5` | **Habits** | A grid of the last few weeks, with current streak, best streak and 30-day rate. Use ←→ to fill in missed days |
| `6` | **Stats** | GitHub-style focus heatmap, week-over-week change, streaks, focus time by task, mood sparkline, log counts by kind |

Press `?` in the app for every key. Other global keys: `tab` to cycle views, `,` to change theme, `q` to quit. If a focus block is running when you quit, the time so far is still logged.

### Quick-log kinds

You can prefix a log entry to categorise it. This works in the TUI and on the command line:

`win:` 🏆 · `til:` 💡 · `blocker:` 🧱 · `bug:` 🐛 · `idea:` ✨. Anything without a prefix is a plain note.

## CLI

Every command works without opening the TUI, so you can log from a shell alias, a git hook or an editor.
If the TUI is open, it reloads within a second.

```sh
devlog log "til: \`git worktree\` lets you check out two branches"
devlog log "blocker: e2e suite flaky on CI"
devlog task "!! fix login redirect #auth"
devlog tasks && devlog done 1
devlog mood 4                     # 1-5  (energy works the same way)
devlog edit                       # today's journal in $EDITOR (yesterday: devlog edit 2026-11-23)
devlog today                      # plain-text summary for today
devlog export 2026-11-17 > week.md  # Markdown report, e.g. for standups or reviews
devlog repo add ~/code/api        # repos to scan for "commits today"
devlog config work 50             # pomodoro lengths: work, short, long, rounds; gitAuthor
devlog focus                      # open the TUI on a view
```

## Your data

Everything lives in `~/.devlog`. You can change the location with `DEVLOG_HOME`:

- `data.json` holds moods, logs, tasks, habits, focus sessions and settings
- `journal/YYYY-MM-DD.md` holds one Markdown file per day. A new file starts from a template (Shipped / Blockers / TIL / Tomorrow / Notes, plus today's commits)

Both are plain text, so you can grep them and keep them in a private git repo.

If you haven't added any repos with `devlog repo add`, the commits panel uses the repo you launched from.
It shows your own commits on all branches, matched by `git config user.email` or by `devlog config gitAuthor`.

## Development

```sh
npm start        # run from source (tsx)
npm test         # unit tests + Ink render tests
npm run build    # bundle to dist/devlog.js
```

Environment: `SCALE=2` makes the focus digits larger. `ASCII_FALLBACK=1` draws them with plain ASCII characters.
