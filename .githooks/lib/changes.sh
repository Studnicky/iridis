#!/bin/bash
set -eu

# Public contract consumed by callers that source this file (e.g. pre-push):
# every CHANGED_* flag below is read by the sourcing script, not just within
# this file, so mark them exported to document that and keep shellcheck from
# flagging them as unused in a standalone analysis of this file.
export CHANGED_DOCS CHANGED_PACKAGES CHANGED_SCRIPTS CHANGED_TESTS \
  CHANGED_CONFIG CHANGED_WORKFLOWS CHANGED_HOOKS CHANGED_SECURITY_CONFIG \
  CHANGED_SOURCE CHANGED_LOCKFILES CHANGED_RELEASE CHANGED_CI \
  CHANGED_AUDIT CHANGED_ANALYSIS

_set_all_changed() {
    CHANGED_DOCS=true
    CHANGED_PACKAGES=true
    CHANGED_SCRIPTS=true
    CHANGED_TESTS=true
    CHANGED_CONFIG=true
    CHANGED_WORKFLOWS=true
    CHANGED_HOOKS=true
    CHANGED_SECURITY_CONFIG=true
    CHANGED_SOURCE=true
    CHANGED_LOCKFILES=true
    CHANGED_RELEASE=true
    CHANGED_CI=true
    CHANGED_AUDIT=true
    CHANGED_ANALYSIS=true
}

classify_changes() {
    local range="$1"
    local changed

    if ! changed=$(git diff --name-only "$range" 2>/dev/null); then
        echo "warning: classify_changes: git diff failed for '$range'; all paths assumed changed" >&2
        _set_all_changed
        return 0
    fi

    CHANGED_DOCS=false
    CHANGED_PACKAGES=false
    CHANGED_SCRIPTS=false
    CHANGED_TESTS=false
    CHANGED_CONFIG=false
    CHANGED_WORKFLOWS=false
    CHANGED_HOOKS=false
    CHANGED_SECURITY_CONFIG=false
    CHANGED_SOURCE=false
    CHANGED_LOCKFILES=false
    CHANGED_RELEASE=false
    CHANGED_CI=false
    CHANGED_AUDIT=false
    CHANGED_ANALYSIS=false

    echo "$changed" | grep -qE '^(site/.*|README\.md)$' && CHANGED_DOCS=true
    echo "$changed" | grep -qE '^packages/' && CHANGED_PACKAGES=true
    echo "$changed" | grep -qE '^scripts/' && CHANGED_SCRIPTS=true
    echo "$changed" | grep -qE '^(packages/.+/tests/|\.githooks/tests/|scripts/.+\.test\.(mjs|ts|js)$)' && CHANGED_TESTS=true
    echo "$changed" | grep -qE '^(\.github/|\.githooks/|tsconfig(\..+)?\.json$|eslint\..+|lint-staged\.config\.js$|package\.json$|pnpm-workspace\.yaml$)' && CHANGED_CONFIG=true
    echo "$changed" | grep -qE '^\.github/(workflows|actions)/' && CHANGED_WORKFLOWS=true
    echo "$changed" | grep -qE '^\.githooks/' && CHANGED_HOOKS=true
    echo "$changed" | grep -qE '^(\.github/(workflows/(audit|codeql|dependency-review|gitleaks|security|security-audit|semgrep)\.yml|ci-secrets\.(json|schema\.json)$|scripts/check-ci-secrets\.mjs$)|\.gitleaks\.toml$|\.semgrepignore$)' && CHANGED_SECURITY_CONFIG=true
    echo "$changed" | grep -qE '(^|/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$' && CHANGED_LOCKFILES=true
    echo "$changed" | grep -qE '^(\.changeset/|package\.json$|packages/.+/package\.json$|packages/.+/CHANGELOG\.md$)' && CHANGED_RELEASE=true

    if [ "$CHANGED_PACKAGES" = true ] || [ "$CHANGED_SCRIPTS" = true ] || [ "$CHANGED_TESTS" = true ] || [ "$CHANGED_LOCKFILES" = true ]; then
        CHANGED_SOURCE=true
    fi

    if [ "$CHANGED_SOURCE" = true ] || [ "$CHANGED_CONFIG" = true ]; then
        CHANGED_CI=true
        CHANGED_ANALYSIS=true
    fi

    if [ "$CHANGED_LOCKFILES" = true ] || [ "$CHANGED_SOURCE" = true ] || [ "$CHANGED_SECURITY_CONFIG" = true ]; then
        CHANGED_AUDIT=true
    fi

    return 0
}
