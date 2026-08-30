---
name: GitHub code backup
description: How the GitHub auto-push is wired — remote, PAT secret, API endpoint, daily trigger, and button location.
---

# GitHub Code Backup

## Setup
- GitHub remote: `https://github.com/transittaxmc-create/islandcity.git` (added as `github` remote in `.git/config`)
- Auth: `GITHUB_PAT` Replit secret — injected at runtime by the API endpoint into the push URL. Token is NOT stored in `.git/config`.
- API endpoint: `POST /api/git-push` → `artifacts/api-server/src/routes/git-push.ts`
  - Rate-limited to once per 10 min
  - Stages + commits any uncommitted changes before pushing
  - Sanitizes PAT from error messages
  - `GET /api/git-push/status` returns last push time + whether PAT is configured

## Daily trigger (frontend)
- `saveGithubPush()` useCallback in App.tsx calls `POST /api/git-push`
- Fires on app load AND in the hourly backup timer if 24+ hours have elapsed since last push
- Last push time stored in `ic-last-github-push` localStorage key, shown in state `githubPushAt`

## Manual button
- Located in REPORTS tab → Settings/Backup section, after the ☁️ Cloud Backup card
- Card: "🐙 GitHub Backup" with last-push timestamp and "Push to GitHub now" button
- Shows `githubPushing` loading state

**Why:** PAT in env var (not git config) keeps credentials out of the repo history. Rate limit prevents runaway pushes from the debounced backup loop.

## Divergent-history safety

Never force-push or automatically merge when the workspace and GitHub `main` histories have diverged. Preserve the local snapshot on a new timestamped `replit-backup/` branch instead.

**Why:** Both histories can contain valid, substantially different work; overwriting or auto-merging can destroy remote code or introduce broad conflicts.

**How to apply:** Attempt the normal `main` push first. Only when Git rejects it as non-fast-forward, create a new backup branch and report success after verifying that branch exists remotely.
