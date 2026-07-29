#!/bin/sh
set -eu

normalize_diff_range() {
  base="$1"
  head="$2"

  if [ -z "$base" ] || [ "$base" = "0000000000000000000000000000000000000000" ]; then
    base=$(git rev-list --max-parents=0 "$head" | tail -1)
  fi

  echo "${base}..${head}"
}

workflow_diff_range() {
  base_sha="${BASE_SHA:-}"
  head_sha="${HEAD_SHA:-${GITHUB_SHA:-}}"

  if [ -z "$head_sha" ]; then
    echo "range: missing HEAD_SHA or GITHUB_SHA" >&2
    return 1
  fi

  case "${GITHUB_EVENT_NAME:-}" in
    pull_request)
      base_sha="${base_sha:-${PR_BASE_SHA:-${GITHUB_BASE_SHA:-}}}"
      head_sha="${head_sha:-${PR_HEAD_SHA:-}}"
      ;;
    push)
      base_sha="${base_sha:-${GITHUB_EVENT_BEFORE:-}}"
      ;;
  esac

  normalize_diff_range "$base_sha" "$head_sha"
}
