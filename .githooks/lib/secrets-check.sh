#!/bin/sh
set -eu

# shellcheck source=security-suite.sh
. "${HOOKS_DIR:-$(dirname "$0")}/lib/security-suite.sh"

check_staged_secrets() {
  run_gitleaks_check staged
}

check_push_range_secrets() {
  range="$1"

  run_gitleaks_check range "$range"
}
