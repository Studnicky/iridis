#!/bin/bash
set -eu

check_commit_subject() {
  subject="$1"
  if printf '%s' "$subject" | grep -Eq '^(feat|fix|chore|docs|refactor|perf|test|ci|build|revert)(\([^)]+\))?!?: .+'; then
    return 0
  fi
  echo "title-check: invalid commit subject '$subject'" >&2
  return 1
}

check_pr_title() {
  local base_ref="$1" head_ref="$2" title="$3"

  case "$base_ref:$head_ref" in
    main:release/*)
      if printf '%s\n' "$title" | grep -Eq '^release: v[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.]+)?( .+)?$'; then
        return 0
      fi
      echo "title-check: release PR titles must use 'release: vX.Y.Z'" >&2
      return 1
      ;;
    main:hotfix/*)
      if printf '%s\n' "$title" | grep -Eq '^(hotfix|fix)(\([^)]+\))?!?: .+'; then
        return 0
      fi
      echo "title-check: hotfix PR titles must use conventional hotfix/fix format" >&2
      return 1
      ;;
    *)
      if printf '%s\n' "$title" | grep -Eq '^(feat|fix|chore|docs|refactor|perf|test|ci|build|revert)(\([^)]+\))?!?: .+'; then
        return 0
      fi
      echo "title-check: PR title must use conventional commit format" >&2
      return 1
      ;;
  esac
}
