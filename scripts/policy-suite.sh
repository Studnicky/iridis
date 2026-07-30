#!/usr/bin/env bash
# Uses `local`, which POSIX sh does not define. Every call site already invokes
# this through bash.
set -eu

run_branch_check() {
  local branch="$1"
  . .githooks/lib/branch-check.sh
  check_branch_name "$branch"
}

run_pr_title_check() {
  local base_ref="$1" head_ref="$2" title="$3"
  . .githooks/lib/runtime.sh
  hook_source_lib title-check.sh
  check_pr_title "$base_ref" "$head_ref" "$title"
}

run_changeset_required_check() {
  . .githooks/lib/release-gates.sh
  assert_changeset_required
}

run_sync_ancestry_check() {
  local base_ref="$1" head_ref="$2"
  . .githooks/lib/sync-check.sh
  assert_sync_ancestry "$base_ref" "$head_ref"
}

case "${1:-}" in
  branch)
    run_branch_check "${2:?missing branch}"
    ;;
  pr-title)
    run_pr_title_check "${2:?missing base ref}" "${3:?missing head ref}" "${4:?missing title}"
    ;;
  changeset-required)
    run_changeset_required_check
    ;;
  sync-ancestry)
    run_sync_ancestry_check "${2:-origin/main}" "${3:-origin/develop}"
    ;;
  *)
    echo "policy-suite: unknown check '${1:-}'" >&2
    exit 1
    ;;
esac
