#!/usr/bin/env bash
#
# Commits freshly-generated pipeline content and pushes it to main — safely.
#
# WHY THIS EXISTS: the daily-ingest and backfill workflows used to end each run
# with a bare `git push`. If main advanced between the runner's checkout and its
# push (a manual commit, or — before the concurrency group — the sibling
# workflow), the push was rejected non-fast-forward, the step failed, the deploy
# was skipped, and a whole run's published workflows were silently dropped.
# (Observed 2026-06-17 on Daily ingest #15.) This script makes the push
# rebase-and-retry, so a concurrent push can never fail the run again. Both
# workflows call it, so the logic lives in exactly one place and cannot drift.
#
# Usage: bash pipeline/commit-content.sh "<commit message>"
# Writes `published=<n>` and a multiline `titles=...` to $GITHUB_OUTPUT.
set -euo pipefail

msg="${1:?usage: commit-content.sh <commit message>}"

git config user.name "opqai-pipeline"
git config user.email "actions@users.noreply.github.com"
git add src/content pipeline/seen.json

# Count/name only NEWLY added published workflows (not edits to existing ones).
added_filter=(--cached --name-only --diff-filter=A -- 'src/content/workflows/*.mdx')
published=$(git diff "${added_filter[@]}" | wc -l)
titles=$(git diff "${added_filter[@]}" | sed 's|src/content/workflows/||; s|\.mdx||' | head -25)

if git diff --cached --quiet; then
  echo "No new content."
  published=0
else
  git commit -m "$msg"

  # Optimistic push; if main advanced under us, rebase our commit onto it and
  # retry. New .mdx files are pure additions, so a rebase is conflict-free in
  # the normal case; if it ever genuinely conflicts we abort and fail loudly
  # rather than push a bad merge.
  pushed=false
  for attempt in 1 2 3 4 5; do
    if git push; then
      pushed=true
      break
    fi
    echo "push attempt ${attempt} rejected — rebasing onto origin/main and retrying"
    if ! git pull --rebase origin main; then
      git rebase --abort 2>/dev/null || true
      echo "rebase onto origin/main failed (conflict) — aborting without pushing"
      exit 1
    fi
  done

  if [ "$pushed" != true ]; then
    echo "Could not push after 5 rebase-and-retry attempts."
    exit 1
  fi
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "published=${published}" >> "$GITHUB_OUTPUT"
  {
    echo "titles<<EOF"
    echo "$titles"
    echo "EOF"
  } >> "$GITHUB_OUTPUT"
fi
