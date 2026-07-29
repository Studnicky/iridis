#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/branch-check.sh
source "../lib/branch-check.sh"

check_branch_name "feature/ENG-123-do-stuff" || fail "valid branch accepted" "rejected"
check_branch_name "feat/ux-remediation" || fail "valid feat branch accepted" "rejected"
check_branch_name "bugfix/ENG-123-fix-thing" || fail "valid bugfix branch accepted" "rejected"
check_branch_name "fix/bootstrap-seed-and-carousel-nav-rows" || fail "valid fix branch accepted" "rejected"
check_branch_name "hotfix/ENG-123-fix-prod" || fail "valid hotfix branch accepted" "rejected"
check_branch_name "chore/ENG-123-bump-deps" || fail "valid chore branch accepted" "rejected"
check_branch_name "release/1.2.3" || fail "valid release branch accepted" "rejected"
check_branch_name "main" || fail "main accepted" "rejected"
check_branch_name "develop" || fail "develop accepted" "rejected"
check_branch_name "docs/ENG-123-write-docs" || fail "valid docs branch accepted" "rejected"
check_branch_name "test/ENG-123-add-coverage" || fail "valid test branch accepted" "rejected"
check_branch_name "refactor/ENG-123-rework" || fail "valid refactor branch accepted" "rejected"
check_branch_name "perf/ENG-123-speed-up" || fail "valid perf branch accepted" "rejected"
check_branch_name "ci/ENG-123-update-pipeline" || fail "valid ci branch accepted" "rejected"
check_branch_name "build/ENG-123-update-build" || fail "valid build branch accepted" "rejected"
check_branch_name "bad-branch" >/dev/null 2>&1 && fail "invalid branch rejected" "accepted"
pass_count=$((pass_count + 15))
test_main
