#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
HOOKS_DIR="$(cd "$PWD/.." && pwd)"
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/audit-check.sh
source "../lib/audit-check.sh"

assert_dependency_audit_calls_pnpm() {
  local repo out
  repo=$(make_repo)
  stub_cmd "$repo" pnpm 'printf "%s\n" "$*"'
  out=$(cd "$repo" && PATH="$repo/bin:$PATH" run_dependency_audit)
  assert_contains "audit invokes pnpm" "audit --prod --audit-level high" "$out"
  pass_count=$((pass_count + 1))
  rm -rf "$repo"
}

assert_dependency_audit_calls_pnpm
test_main
