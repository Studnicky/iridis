#!/bin/sh
set -eu

. "$(dirname "$0")/../.githooks/lib/release-gates.sh"

release_suite_changeset_status() {
  default_ref="${1:-origin/develop}"
  if [ -d .changeset ]; then
    env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$default_ref"
  fi
}

release_suite_verify_lockstep() {
  expected_version="$1"
  assert_workspace_lockstep_version "$expected_version"
  assert_no_pending_changesets
}

release_suite_verify_backmerge() {
  expected_version="$1"
  base_ref="${2:-origin/develop}"
  main_ref="${3:-origin/main}"

  assert_workspace_lockstep_version "$expected_version"
  approved_changeset_delta=$(git diff --name-status "$base_ref".."$main_ref" -- .changeset)
  actual_changeset_delta=$(git diff --name-status "$base_ref"..HEAD -- .changeset)
  unexpected_changeset_delta=''

  if [ -n "$actual_changeset_delta" ]; then
    while IFS= read -r actual_changeset_record; do
      if ! printf '%s\n' "$approved_changeset_delta" | grep -F -x -q -- "$actual_changeset_record"; then
        unexpected_changeset_delta="${unexpected_changeset_delta}${actual_changeset_record}\n"
      fi
    done <<EOF_INNER
$actual_changeset_delta
EOF_INNER
  fi

  if [ -n "$unexpected_changeset_delta" ]; then
    echo "::error::Release backmerge .changeset delta contains records not approved by ${main_ref}; preserve pending develop changesets." >&2
    echo "Approved ${main_ref} delta:" >&2
    printf '%s\n' "$approved_changeset_delta" >&2
    echo "Unexpected backmerge records:" >&2
    printf '%b' "$unexpected_changeset_delta" >&2
    return 1
  fi
}

release_suite_publish_gates() {
  expected_version="$1"
  root_version=$(release_root_version)
  if [ "$expected_version" != "$root_version" ]; then
    echo "::error::Tag version (${expected_version}) does not match root package.json version (${root_version})" >&2
    return 1
  fi
  release_suite_verify_lockstep "$expected_version"
}

case "${1:-}" in
  changeset-status)
    release_suite_changeset_status "${2:-origin/develop}"
    ;;
  verify-lockstep)
    release_suite_verify_lockstep "${2:?missing version}"
    ;;
  verify-backmerge)
    release_suite_verify_backmerge "${2:?missing version}" "${3:-origin/develop}" "${4:-origin/main}"
    ;;
  publish-gates)
    release_suite_publish_gates "${2:?missing version}"
    ;;
  *)
    echo "release-suite: unknown suite '${1:-}'" >&2
    exit 1
    ;;
esac
