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
    stub_cmd "$repo" node 'printf "%s\n" "$*"'
    out=$(PATH="$repo/bin:$PATH" run_audit_check)
    assert_contains "security audit" "scripts/audit-production-dependencies.mjs" "$out"

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

assert_production_audit_exception_contract() {
  local project_root repo audit exceptions

  project_root=$(cd ../.. && pwd)
  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    audit="$repo/audit.json"
    exceptions="$repo/exceptions.json"

    cat > "$audit" <<'JSON'
{"advisories":{"1240912":{"severity":"high","findings":[{"paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge"]}]},"1240992":{"severity":"high","findings":[{"paths":["site>@nuxt/content>micromatch>braces"]}]}}}
JSON
    cat > "$exceptions" <<'JSON'
{"exceptions":[{"advisoryId":"1240912","createdAt":"2026-10-15T00:00:00Z","expiresAt":"2026-11-14T23:59:59Z","paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge"],"reason":"GitHub Pages build dependency"},{"advisoryId":"1240992","createdAt":"2026-10-15T00:00:00Z","expiresAt":"2026-11-14T23:59:59Z","paths":["site>@nuxt/content>micromatch>braces"],"reason":"GitHub Pages build dependency"}]}
JSON
    node "$project_root/scripts/audit-production-dependencies.mjs" --audit-file "$audit" --exceptions-file "$exceptions" --now 2026-10-20T00:00:00Z

    cat > "$exceptions" <<'JSON'
{"exceptions":[{"advisoryId":"1240912","createdAt":"2026-10-15T00:00:00Z","expiresAt":"2026-10-19T23:59:59Z","paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge"],"reason":"GitHub Pages build dependency"}]}
JSON
    if node "$project_root/scripts/audit-production-dependencies.mjs" --audit-file "$audit" --exceptions-file "$exceptions" --now 2026-10-20T00:00:00Z >/dev/null 2>&1; then
      fail "expired production audit exception" "expired exceptions must fail"
    fi

    cat > "$audit" <<'JSON'
{"advisories":{"1240912":{"severity":"high","findings":[{"paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge>unmatched"]}]}}}
JSON
    cat > "$exceptions" <<'JSON'
{"exceptions":[{"advisoryId":"1240912","createdAt":"2026-10-15T00:00:00Z","expiresAt":"2026-11-14T23:59:59Z","paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge"],"reason":"GitHub Pages build dependency"}]}
JSON
    if node "$project_root/scripts/audit-production-dependencies.mjs" --audit-file "$audit" --exceptions-file "$exceptions" --now 2026-10-20T00:00:00Z >/dev/null 2>&1; then
      fail "unmatched production audit path" "exceptions must match the full dependency path"
    fi

    cat > "$audit" <<'JSON'
{"advisories":{"1240912":{"severity":"critical","findings":[{"paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge"]}]}}}
JSON
    if node "$project_root/scripts/audit-production-dependencies.mjs" --audit-file "$audit" --exceptions-file "$exceptions" --now 2026-10-20T00:00:00Z >/dev/null 2>&1; then
      fail "critical production audit finding" "exceptions must not suppress critical findings"
    fi

    cat > "$audit" <<'JSON'
{"advisories":{"9999999":{"severity":"high","findings":[{"paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge"]}]}}}
JSON
    if node "$project_root/scripts/audit-production-dependencies.mjs" --audit-file "$audit" --exceptions-file "$exceptions" --now 2026-10-20T00:00:00Z >/dev/null 2>&1; then
      fail "unapproved production audit advisory" "only declared advisory IDs may be excepted"
    fi

    cat > "$exceptions" <<'JSON'
{"exceptions":[{"advisoryId":"1240912","createdAt":"2026-10-15T00:00:00Z","expiresAt":"2026-11-15T00:00:00Z","paths":["site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge"],"reason":"GitHub Pages build dependency"}]}
JSON
    if node "$project_root/scripts/audit-production-dependencies.mjs" --audit-file "$audit" --exceptions-file "$exceptions" --now 2026-10-20T00:00:00Z >/dev/null 2>&1; then
      fail "production audit exception TTL" "exceptions may not exceed 30 days"
    fi
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_security_suite_calls_shared_commands
assert_production_audit_exception_contract
test_main
