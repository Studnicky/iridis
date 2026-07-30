#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
HOOKS_DIR="$(cd "$PWD/.." && pwd)"
# shellcheck source=../lib/secrets-check.sh
source "../lib/secrets-check.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  echo "const x = 1" > file.ts
  git add file.ts
  stub_cmd "$repo" gitleaks 'exit 0'
  check_staged_secrets
)
rm -rf "$repo"
pass_count=$((pass_count + 1))
printf 'PASS: %s\n' "$pass_count"
