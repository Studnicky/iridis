#!/bin/sh
set -eu

check_branch_name() {
  branch="$1"
  case "$branch" in
    main|develop|release/*|hotfix/*|feature/*|feat/*|bugfix/*|fix/*|chore/*|docs/*|test/*|refactor/*|perf/*|ci/*|build/*) return 0 ;;
    dependabot/*) return 0 ;;
  esac

  if printf '%s' "$branch" | grep -Eq '^[a-z]+/[A-Z]{2,5}-[0-9]+([-/][A-Za-z0-9]+)*$'; then
    return 0
  fi

  echo "branch-check: invalid branch name '$branch'" >&2
  return 1
}
