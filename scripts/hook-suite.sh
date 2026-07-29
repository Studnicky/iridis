#!/bin/sh
set -eu

run_hook_suite_full() {
  bash scripts/ci-suite.sh generated-artifacts typecheck lint test build
}

run_hook_suite_ci_check() {
  check="$1"
  bash scripts/ci-suite.sh "$check"
}

run_hook_suite_audit() {
  bash scripts/ci-suite.sh audit
}

run_hook_suite_diagram() {
  CI_SUITE_BASE_REF="${1:-origin/develop}" bash scripts/ci-suite.sh diagram-blast-radius
}

is_release_backmerge() {
  backmerge_branch="$1"
  backmerge_base_ref="$2"

  case "$backmerge_branch" in
    chore/*backmerge*) ;;
    *) return 1 ;;
  esac

  backmerge_main_sha=$(git rev-parse --verify origin/main 2>/dev/null) || return 1
  git rev-parse --verify "$backmerge_base_ref" >/dev/null 2>&1 || return 1

  git rev-list --parents "${backmerge_base_ref}..HEAD" | awk -v main_sha="$backmerge_main_sha" '
    NF >= 3 {
      for (parent_index = 2; parent_index <= NF; parent_index += 1) {
        if ($parent_index == main_sha) {
          found = 1
        }
      }
    }
    END {
      exit found ? 0 : 1
    }
  '
}

run_hook_suite_release_gates() {
  base_ref="${1:-origin/develop}"
  branch=$(git rev-parse --abbrev-ref HEAD)
  case "$branch" in
    release/*|hotfix/*)
      version=$(node -p "require('./package.json').version")
      bash scripts/release-suite.sh publish-gates "$version"
      ;;
    *)
      if is_release_backmerge "$branch" "$base_ref"; then
        version=$(node -p "require('./package.json').version")
        bash scripts/release-suite.sh verify-backmerge "$version" "$base_ref"
      else
        bash scripts/release-suite.sh changeset-status "$base_ref"
      fi
      ;;
  esac
}

run_hook_suite_semgrep() {
  range="$1"
  bash scripts/security-suite.sh semgrep-range "$range"
}

case "${1:-}" in
  full)
    run_hook_suite_full
    ;;
  audit)
    run_hook_suite_audit
    ;;
  diagram)
    run_hook_suite_diagram "${2:-origin/develop}"
    ;;
  release-gates)
    run_hook_suite_release_gates "${2:-origin/develop}"
    ;;
  semgrep)
    run_hook_suite_semgrep "${2:?missing range}"
    ;;
  generated-artifacts|stamp-version-check|diagram-check|typecheck|lint|test|build)
    run_hook_suite_ci_check "$1"
    ;;
  config-schema-check)
    run_hook_suite_ci_check "$1"
    ;;
  *)
    echo "hook-suite: unknown suite '${1:-}'" >&2
    exit 1
    ;;
esac
