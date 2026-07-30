#!/bin/sh
set -eu

# shellcheck source=security-suite.sh
. "${HOOKS_DIR:-$(dirname "$0")}/lib/security-suite.sh"

check_semgrep_findings() {
  range="$1"

  run_semgrep_check "$range"
}
