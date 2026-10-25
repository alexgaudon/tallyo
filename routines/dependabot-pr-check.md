---
title: Weekly Dependabot PR check
description: >
  Managed by a kimaki routine. Do not move or delete this file
  without also updating the routine (kimaki routine list / kimaki routine edit).
---

# Weekly Dependabot PR check

Runs every Sunday (cron `30 11 * * 0` UTC = 09:00 America/St_Johns).

## Goal

Review every open Dependabot PR on `alexgaudon/tallyo` and post a short,
actionable list so the owner (Discord ID `489123999889227776`) knows exactly
what needs a decision this week.

Tallyo is an npm workspace (`package-lock.json`, `apps/server`, `apps/web`)
driven by Vite+ (`vp`). Dependabot is configured in `.github/dependabot.yml`:

- **npm**: weekly, minor+patch updates arrive as one grouped PR
  (`npm-minor-patch`); majors arrive as individual PRs.
- **docker**: monthly, one PR per `/apps/server` and `/apps/web` Dockerfile.
- **github-actions**: monthly.

CI is `.github/workflows/build.yml` and `.github/workflows/test.yml`.

## Steps

1. From the repo root run `git fetch --all --prune`.
2. List open Dependabot PRs:
   ```bash
   gh pr list --repo alexgaudon/tallyo --author 'app/dependabot' --state open \
     --limit 50 --json number,title,url,createdAt,updatedAt,isDraft,mergeable,mergeStateStatus,headRefName,labels,additions,deletions,changedFiles
   ```
3. For each PR collect:
   - CI result: `gh pr checks <number>` (name the failing checks, or note pending).
   - `mergeStateStatus`: `CLEAN` / `BEHIND` / `BLOCKED` / `DIRTY` / `UNSTABLE` / `DRAFT`.
   - The bump itself: `gh pr view <number> --json body` and read Dependabot's
     release notes. Classify as patch / minor / major and list the packages
     (a grouped PR can contain many; call out anything the repo actually
     imports, and any runtime dependency under `apps/server` or `apps/web`).
   - Review comments / `CHANGES_REQUESTED` if any.
4. Optionally, if the repo has Dependabot alerts enabled, check them (ignore
   the command failing — e.g. alerts disabled):
   ```bash
   gh api 'repos/alexgaudon/tallyo/dependabot/alerts?state=open' --paginate 2>/dev/null
   ```
5. Age and staleness: note PRs open longer than ~2 weeks or with a
   `mergeStateStatus` of `BEHIND`/`DIRTY` — those need a rebase or
   `@dependabot rebase`.

## Constraints

- **Read-only.** Do not merge, approve, comment, rebase, or force-push. No
  `gh pr merge`, no `gh pr comment`, no `gh pr review`, no `@dependabot` commands.
- Do not create branches, worktrees, or commits. Do not run `npm install` or
  modify the lockfile.
- Do not open issues or follow-up PRs.
- If `gh` fails (auth, network, repo not found), post the exact error and stop.
- If there are no open Dependabot PRs, post one short line saying so, do not
  mention the owner, and archive this thread (`kimaki session archive <thread id>`).
- Prefer accuracy over volume: if a detail is unknown, say "unknown" instead of
  guessing. Never claim CI passed without seeing the check result.

## Expected output

A single message in this thread, structured like this:

```
## Needs your decision
- #12 — major: @vitejs/plugin-react 4 → 5 (apps/web) — CI ❌ test, typecheck
  → breaking changes in the React plugin; needs a code migration before merge.
- #9  — DIRTY: docker node 22 → 24 (apps/server) — merge conflict in Dockerfile
  → tell @dependabot to rebase, then merge.

## Safe to merge
- #14 — grouped npm minor/patch (7 packages) — CI ✅, CLEAN → merge as-is.

## Waiting / low priority
- #11 — github-actions bump — CI ✅, BEHIND → will rebase on next push.
```

- Only include sections that have entries.
- One line per PR with `#number`, the bump, CI state, merge state, and the
  recommended next action.
- Mention the owner `<@489123999889227776>` once, at the top, when at least one
  PR needs a decision.
- End with a one-line tally: `N open · N ready · N blocked`.

## Completion criteria

- The report above is posted (or a "no open PRs" line).
- Nothing on GitHub was modified, and the working tree is unchanged.
