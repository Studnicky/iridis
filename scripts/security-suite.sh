#!/bin/sh
set -eu

. "$(dirname "$0")/../.githooks/lib/range.sh"
. "$(dirname "$0")/../.githooks/lib/security-suite.sh"

case "${1:-}" in
  audit) run_audit_check ;;
  gitleaks-staged) run_gitleaks_check staged ;;
  gitleaks-range) run_gitleaks_check range "${2:-$(workflow_diff_range)}" ;;
  semgrep-range) run_semgrep_check "${2:-$(workflow_diff_range)}" ;;
  semgrep-sarif-range) run_semgrep_sarif_check "${2:-$(workflow_diff_range)}" "${3:-semgrep.sarif}" ;;
  *)
    echo "security-suite: unknown check '${1:-}'" >&2
    exit 1
    ;;
esac
