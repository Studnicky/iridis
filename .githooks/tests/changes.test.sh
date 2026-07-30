#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/changes.sh
source "../lib/changes.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  classify_changes "HEAD~0..HEAD"
  assert_eq "docs" "false" "$CHANGED_DOCS"
  assert_eq "packages" "false" "$CHANGED_PACKAGES"
  assert_eq "scripts" "false" "$CHANGED_SCRIPTS"
  assert_eq "tests" "false" "$CHANGED_TESTS"
  assert_eq "source" "false" "$CHANGED_SOURCE"
  assert_eq "config" "false" "$CHANGED_CONFIG"
  assert_eq "workflows" "false" "$CHANGED_WORKFLOWS"
  assert_eq "hooks" "false" "$CHANGED_HOOKS"
  assert_eq "security_config" "false" "$CHANGED_SECURITY_CONFIG"
  assert_eq "lockfiles" "false" "$CHANGED_LOCKFILES"
  assert_eq "release" "false" "$CHANGED_RELEASE"
  assert_eq "ci" "false" "$CHANGED_CI"
  assert_eq "audit" "false" "$CHANGED_AUDIT"
  assert_eq "analysis" "false" "$CHANGED_ANALYSIS"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

_set_all_changed
assert_eq "all docs" "true" "$CHANGED_DOCS"
assert_eq "all source" "true" "$CHANGED_SOURCE"
assert_eq "all tests" "true" "$CHANGED_TESTS"
pass_count=$((pass_count + 1))

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p site/app packages/foo
  echo "x" > site/app/app.vue
  printf '%s\n' '{"name":"@test/foo","version":"1.0.0"}' > packages/foo/package.json
  git add -A
  git commit -q -m "site and package"
  classify_changes "HEAD~1..HEAD"
  assert_eq "docs (site)" "true" "$CHANGED_DOCS"
  assert_eq "packages" "true" "$CHANGED_PACKAGES"
  assert_eq "release (package.json)" "true" "$CHANGED_RELEASE"
  assert_eq "source" "true" "$CHANGED_SOURCE"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p packages/foo/tests/unit
  : > packages/foo/tests/unit/foo.test.ts
  git add -A
  git commit -q -m "package test"
  classify_changes "HEAD~1..HEAD"
  assert_eq "tests" "true" "$CHANGED_TESTS"
  assert_eq "source (tests)" "true" "$CHANGED_SOURCE"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p .github/workflows
  echo "name: semgrep" > .github/workflows/semgrep.yml
  git add -A
  git commit -q -m "security workflow"
  classify_changes "HEAD~1..HEAD"
  assert_eq "workflow" "true" "$CHANGED_WORKFLOWS"
  assert_eq "security config" "true" "$CHANGED_SECURITY_CONFIG"
  assert_eq "audit" "true" "$CHANGED_AUDIT"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

test_main
