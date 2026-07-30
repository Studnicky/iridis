#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/rebase-check.sh
source "../lib/rebase-check.sh"

rebase_base_for_branch "release/1.2" develop >/dev/null
push_has_gatable_ref develop <<EOF
refs/heads/feature/x 123 refs/heads/feature/x 0
EOF
pass_count=$((pass_count + 2))
test_main
