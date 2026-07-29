#!/bin/sh
set -eu

# shellcheck source=security-suite.sh
. "${HOOKS_DIR:-$(dirname "$0")}/lib/security-suite.sh"

run_dependency_audit() {
  run_audit_check
}
