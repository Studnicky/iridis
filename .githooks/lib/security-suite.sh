#!/bin/sh
set -eu

run_audit_check() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm audit --prod --audit-level high
    return $?
  fi

  if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
    echo "security-suite: pnpm is required for this run" >&2
    return 127
  fi

  echo "security-suite: pnpm not installed; skipping audit" >&2
  return 0
}

run_gitleaks_check() {
  mode="$1"
  target="${2:-}"

  if ! command -v gitleaks >/dev/null 2>&1; then
    if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
      echo "security-suite: gitleaks is required for this run" >&2
      return 127
    fi
    echo "security-suite: gitleaks not installed; skipping ${mode}" >&2
    return 0
  fi

  case "$mode" in
    staged) gitleaks protect --staged --redact --no-banner ;;
    range) gitleaks detect --no-banner --redact --source . --log-opts="$target" ;;
    *)
      echo "security-suite: unknown gitleaks mode '$mode'" >&2
      return 1
      ;;
  esac
}

prepare_semgrep_environment() {
  semgrep_state_dir="${SEMGREP_STATE_DIR:-${TMPDIR:-/tmp}/iridis-semgrep}"
  mkdir -p "$semgrep_state_dir/config" "$semgrep_state_dir/cache"
  export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$semgrep_state_dir/config}"
  export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$semgrep_state_dir/cache}"
  export SEMGREP_LOG_FILE="${SEMGREP_LOG_FILE:-$semgrep_state_dir/semgrep.log}"
  export SEMGREP_SETTINGS_FILE="${SEMGREP_SETTINGS_FILE:-$semgrep_state_dir/settings.yml}"
  if [ -z "${SSL_CERT_FILE:-}" ] && [ -f /opt/homebrew/etc/ca-certificates/cert.pem ]; then
    export SSL_CERT_FILE=/opt/homebrew/etc/ca-certificates/cert.pem
  fi
}

prepare_semgrep_git_environment() {
  git config --global --add safe.directory "$(pwd)" >/dev/null 2>&1 || true
}

semgrep_targets_for_range() {
  range="$1"
  target_file="$2"
  prepare_semgrep_git_environment
  git diff --name-only -z --diff-filter=ACMR "$range" > "$target_file"
}

run_semgrep_check() {
  range="$1"
  targets_file=$(mktemp "${TMPDIR:-/tmp}/iridis-semgrep-targets.XXXXXX")

  if ! command -v semgrep >/dev/null 2>&1; then
    if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
      echo "security-suite: semgrep is required for this run" >&2
      return 127
    fi
    echo "security-suite: semgrep not installed; skipping scan" >&2
    return 0
  fi

  prepare_semgrep_environment
  semgrep_targets_for_range "$range" "$targets_file"
  if [ ! -s "$targets_file" ]; then
    rm -f "$targets_file"
    echo "security-suite: no changed files for semgrep in $range"
    return 0
  fi

  if xargs -0 semgrep scan --quiet --config=auto --error --disable-version-check < "$targets_file"; then
    rm -f "$targets_file"
    return 0
  fi

  rm -f "$targets_file"
  echo "security-suite: findings detected in $range" >&2
  return 1
}

run_semgrep_sarif_check() {
  range="$1"
  output="${2:-semgrep.sarif}"
  targets_file=$(mktemp "${TMPDIR:-/tmp}/iridis-semgrep-targets.XXXXXX")

  if ! command -v semgrep >/dev/null 2>&1; then
    if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
      echo "security-suite: semgrep is required for this run" >&2
      return 127
    fi
    echo "security-suite: semgrep not installed; skipping sarif scan" >&2
    return 0
  fi

  prepare_semgrep_environment
  semgrep_targets_for_range "$range" "$targets_file"
  if [ ! -s "$targets_file" ]; then
    printf '{"version":"2.1.0","runs":[]}\n' > "$output"
    rm -f "$targets_file"
    echo "security-suite: no changed files for semgrep in $range"
    return 0
  fi

  if xargs -0 semgrep scan --quiet --config=auto --error --disable-version-check --sarif --output="$output" < "$targets_file"; then
    rm -f "$targets_file"
    return 0
  fi

  rm -f "$targets_file"
  echo "security-suite: findings detected in $range" >&2
  return 1
}
