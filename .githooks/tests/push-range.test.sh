#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/push-range.sh
source "../lib/push-range.sh"

repo=$(make_repo)
(cd "$repo" && git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop 2>/dev/null || true)
pass_count=$((pass_count + 1))
test_main
