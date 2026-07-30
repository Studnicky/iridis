#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/title-check.sh
source "../lib/title-check.sh"

assert_commit_subject() {
  check_commit_subject "feat(core): add thing" || fail "commit subject" "valid subject rejected"
  check_commit_subject "bad subject" >/dev/null 2>&1 && fail "commit subject" "invalid subject accepted"
  pass_count=$((pass_count + 2))
}

assert_pr_title() {
  check_pr_title "main" "feature/ENG-123-test" "feat(core): add thing" || fail "pr title" "valid conventional title rejected"
  check_pr_title "main" "release/1.2" "release: v1.2.3" || fail "pr title" "valid release title rejected"
  check_pr_title "main" "hotfix/1.2" "fix(core): patch" || fail "pr title" "valid hotfix title rejected"
  check_pr_title "main" "release/1.2" "feat(core): wrong" >/dev/null 2>&1 && fail "pr title" "invalid release title accepted"
  pass_count=$((pass_count + 4))
}

assert_commit_subject
assert_pr_title
test_main
