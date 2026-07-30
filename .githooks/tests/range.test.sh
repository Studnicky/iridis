#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/range.sh
source "../lib/range.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  root=$(git rev-list --max-parents=0 HEAD | tail -1)
  out=$(normalize_diff_range 0000000000000000000000000000000000000000 HEAD)
  assert_eq "root range" "${root}..HEAD" "$out"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))
test_main
