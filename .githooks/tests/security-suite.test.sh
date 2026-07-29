#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/security-suite.sh
source "../lib/security-suite.sh"

assert_security_suite_calls_shared_commands() {
  local repo out

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    stub_cmd "$repo" pnpm 'printf "%s\n" "$*"'
    out=$(PATH="$repo/bin:$PATH" run_audit_check)
    assert_contains "security audit" "audit --prod --audit-level high" "$out"

    stub_cmd "$repo" gitleaks 'printf "%s\n" "$*"'
    out=$(PATH="$repo/bin:$PATH" run_gitleaks_check staged)
    assert_contains "gitleaks staged" "protect --staged --redact --no-banner" "$out"

    mkdir -p src
    echo "const x = 1" > src/file.ts
    git add src/file.ts
    git commit -q -m "add file"

    stub_cmd "$repo" semgrep 'printf "%s\n" "$*"'
    out=$(PATH="$repo/bin:$PATH" run_semgrep_check "HEAD~1..HEAD")
    assert_contains "semgrep scan" "scan --quiet --config=auto --error --disable-version-check src/file.ts" "$out"

    out=$(PATH="$repo/bin:$PATH" run_semgrep_sarif_check "HEAD~1..HEAD" semgrep.sarif)
    assert_contains "semgrep sarif" "scan --quiet --config=auto --error --disable-version-check --sarif --output=semgrep.sarif src/file.ts" "$out"

    if SECURITY_SUITE_REQUIRE_TOOLS=true PATH="$repo/empty-bin" run_gitleaks_check staged >/dev/null 2>&1; then
      fail "required gitleaks" "missing gitleaks should fail when tools are required"
    fi
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_security_suite_calls_shared_commands
test_main
