#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/worktree-cleanup.sh
source "../lib/worktree-cleanup.sh"

assert_clean_removes_merged_worktree() {
  local repo linked out
  repo=$(make_repo)
  linked=$(mktemp -d)
  (cd "$repo" && git worktree add -q -b merged-wt "$linked" HEAD)
  (
    cd "$repo" || exit 1
    git update-ref refs/remotes/origin/HEAD refs/heads/master 2>/dev/null || true
    git branch --set-upstream-to=HEAD merged-wt >/dev/null 2>&1 || true
  )
  out=$(cd "$repo" && cleanup_stale_worktrees true develop main)
  assert_contains "dry-run reports stale worktree" "would remove stale worktree 'merged-wt'" "$out"
  rm -rf "$repo" "$linked"
}

assert_clean_removes_merged_worktree
test_main
