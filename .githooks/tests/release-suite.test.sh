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

assert_release_suite_backmerge_accepts_release_changeset_delta() {
  local repo base_sha main_sha

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    mkdir -p .changeset packages/a
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    printf '%s\n' 'release' > .changeset/release.md
    printf '%s\n' 'pending' > .changeset/pending.md
    git add -A
    git commit -q -m "chore: prepare release changesets"
    base_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/develop "$base_sha"

    git switch -q -c main "$base_sha"
    git rm -q .changeset/release.md
    git commit -q -m "chore(release): consume release changeset"
    main_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/main "$main_sha"

    git switch -q develop
    git merge --ff-only -q main
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge 1.0.0 origin/develop origin/main
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_release_suite_backmerge_accepts_omitted_approved_delta() {
  local repo base_sha main_sha

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    mkdir -p .changeset packages/a
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    printf '%s\n' 'release' > .changeset/release.md
    printf '%s\n' 'provenance' > .changeset/provenance.md
    printf '%s\n' 'pending' > .changeset/pending.md
    git add -A
    git commit -q -m "chore: prepare release changesets"
    base_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/develop "$base_sha"

    git switch -q -c main "$base_sha"
    git rm -q .changeset/release.md .changeset/provenance.md
    git commit -q -m "chore(release): consume release changesets"
    main_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/main "$main_sha"

    git switch -q develop
    git merge --ff-only -q main
    printf '%s\n' 'provenance' > .changeset/provenance.md
    git add .changeset/provenance.md
    git commit -q -m "chore: retain provenance changeset"
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge 1.0.0 origin/develop origin/main
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_release_suite_backmerge_rejects_pending_changeset_delta() {
  local repo base_sha main_sha

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    mkdir -p .changeset packages/a
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    printf '%s\n' 'release' > .changeset/release.md
    printf '%s\n' 'pending' > .changeset/pending.md
    git add -A
    git commit -q -m "chore: prepare release changesets"
    base_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/develop "$base_sha"

    git switch -q -c main "$base_sha"
    git rm -q .changeset/release.md
    git commit -q -m "chore(release): consume release changeset"
    main_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/main "$main_sha"

    git switch -q develop
    git merge --ff-only -q main
    printf '%s\n' 'altered pending' > .changeset/pending.md
    git add .changeset/pending.md
    git commit -q -m "chore: alter pending changeset"
    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge 1.0.0 origin/develop origin/main 2>/tmp/release-suite-backmerge.out; then
      fail "release backmerge changesets" "expected altered pending .changeset entry to fail"
    fi
    assert_contains "release backmerge error" "Release backmerge .changeset delta contains records not approved by origin/main" "$(cat /tmp/release-suite-backmerge.out)"
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_release_suite_dispatches_shared_gates
assert_release_suite_backmerge_accepts_release_changeset_delta
assert_release_suite_backmerge_accepts_omitted_approved_delta
assert_release_suite_backmerge_rejects_pending_changeset_delta
test_main
