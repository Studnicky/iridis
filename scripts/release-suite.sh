#!/bin/sh
set -eu

. "$(dirname "$0")/../.githooks/lib/release-gates.sh"

release_suite_is_versioned_release() {
  base_ref="$1"
  root_version=$(release_root_version)
  base_root_version=$(git show "${base_ref}:package.json" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version")

  if ! node -e "const semver = require('semver'); process.exit(semver.valid(process.argv[1]) && semver.valid(process.argv[2]) && semver.gt(process.argv[1], process.argv[2]) ? 0 : 1)" "$root_version" "$base_root_version"; then
    echo "::error::Root package version (${root_version}) must be a strict semver increase from ${base_ref} (${base_root_version}) to accept an already-versioned release." >&2
    return 1
  fi

  assert_workspace_lockstep_version "$root_version"

  missing_release_artifacts=''
  for pkg_json in packages/*/package.json; do
    pkg_private=$(node -p "require('./${pkg_json}').private || false")
    [ "$pkg_private" = "true" ] && continue

    pkg_directory=$(dirname "$pkg_json")
    pkg_name=$(node -p "require('./${pkg_json}').name")
    if ! git diff --quiet "$base_ref" -- "$pkg_json"; then
      :
    else
      missing_release_artifacts="${missing_release_artifacts}${pkg_name}: package.json\n"
    fi
    if [ ! -f "$pkg_directory/CHANGELOG.md" ] || git diff --quiet "$base_ref" -- "$pkg_directory/CHANGELOG.md"; then
      missing_release_artifacts="${missing_release_artifacts}${pkg_name}: CHANGELOG.md\n"
    fi
  done

  if [ -n "$missing_release_artifacts" ]; then
    echo "::error::Every public package must change package.json and CHANGELOG.md from ${base_ref} for an already-versioned release:" >&2
    printf '%b' "$missing_release_artifacts" >&2
    return 1
  fi
}

release_suite_changeset_status() {
  default_ref="${1:-origin/develop}"
  [ -d .changeset ] || return 0

  changeset_status_output=''
  if changeset_status_output=$(env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$default_ref" 2>&1); then
    printf '%s\n' "$changeset_status_output"
    return 0
  else
    changeset_status_code=$?
  fi

  if [ "$changeset_status_code" -ne 1 ] || ! printf '%s\n' "$changeset_status_output" | grep -F -q 'Some packages have been changed but no changesets were found. Run changeset add to resolve this error.' || ! printf '%s\n' "$changeset_status_output" | grep -F -q 'If this change doesn'\''t need a release, run changeset add --empty.'; then
    printf '%s\n' "$changeset_status_output" >&2
    return 1
  fi

  release_suite_is_versioned_release "$default_ref"
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
