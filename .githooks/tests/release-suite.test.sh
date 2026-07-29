#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

RELEASE_SUITE="$(cd "$PWD/../.." && pwd)/scripts/release-suite.sh"

assert_release_suite_dispatches_shared_gates() {
  local repo

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    mkdir -p .changeset packages/a packages/b
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    printf '%s\n' '{"name":"b","version":"1.0.0"}' > packages/b/package.json
    stub_cmd "$repo" pnpm 'printf "%s\n" "$*"'

    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-lockstep 1.0.0
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" changeset-status origin/develop
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" publish-gates 1.0.0
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_release_suite_backmerge_preserves_base_changesets() {
  local repo base_sha

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    mkdir -p .changeset packages/a
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    printf '%s\n' 'pending' > .changeset/pending.md
    git add -A
    git commit -q -m "chore: pending develop changeset"
    base_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/develop "$base_sha"

    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge 1.0.0 origin/develop

    printf '%s\n' 'changed' > .changeset/pending.md
    git add .changeset/pending.md
    git commit -q -m "chore: alter pending changeset"
    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge 1.0.0 origin/develop 2>/tmp/release-suite-backmerge.out; then
      fail "release backmerge changesets" "expected changed .changeset entries to fail"
    fi
    assert_contains "release backmerge error" "Release backmerge changes .changeset entries" "$(cat /tmp/release-suite-backmerge.out)"
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_release_suite_dispatches_shared_gates
assert_release_suite_backmerge_preserves_base_changesets
test_main
