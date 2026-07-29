#!/bin/sh
set -eu

. "$(dirname "$0")/../.githooks/lib/security-suite.sh"

# Resolves the file each package declares as its public entry point (the
# `exports["."]` import target, falling back to `main`, falling back to the
# conventional `dist/index.js`) so verification matches what consumers
# actually resolve rather than assuming a single hardcoded path.
package_entry_point() {
  pkgjson="$1"
  node -p "
    const pkg = require('./${pkgjson}');
    const exp = pkg.exports && pkg.exports['.'];
    const fromExports = exp && typeof exp === 'object'
      ? (exp.import || exp.require || exp.default)
      : (typeof exp === 'string' ? exp : undefined);
    (fromExports || pkg.main || 'dist/index.js').replace(/^\.\//, '');
  "
}

package_is_private() {
  node -p "require('./$1').private || false"
}

verify_dist() {
  missing=0
  for pkgjson in packages/*/package.json; do
    dir=$(dirname "$pkgjson")
    # Private packages (e.g. design-system-contracts) publish nothing and are
    # excluded from dist verification, matching the lockstep-version exclusion
    # in .githooks/lib/release-gates.sh.
    [ "$(package_is_private "$pkgjson")" = "true" ] && continue

    entry=$(package_entry_point "$pkgjson")
    if [ -f "$dir/$entry" ]; then continue; fi
    echo "::error::missing $entry for $dir"; missing=1
  done
  test "$missing" -eq 0
}

dist_ready() {
  for pkgjson in packages/*/package.json; do
    dir=$(dirname "$pkgjson")
    [ "$(package_is_private "$pkgjson")" = "true" ] && continue

    entry=$(package_entry_point "$pkgjson")
    if [ ! -f "$dir/$entry" ]; then return 1; fi
  done
}

prepare_dist() {
  if dist_ready; then return 0; fi
  pnpm run build
}

for check in "$@"; do
  case "$check" in
    stamp-version-check) pnpm run stamp-version:check ;;
    typecheck) pnpm run typecheck ;;
    lint) prepare_dist && pnpm run lint ;;
    test) prepare_dist && pnpm run test ;;
    build) pnpm run build && verify_dist ;;
    generated-artifacts) pnpm run stamp-version:check ;;
    config-schema-check)
      echo "ci-suite: config-schema not applicable to iridis; skipping" >&2
      ;;
    diagram-check | diagram-blast-radius)
      echo "ci-suite: dependency diagram not applicable to iridis; skipping" >&2
      ;;
    audit) run_audit_check ;;
    verify-dist) prepare_dist && verify_dist ;;
    *)
      echo "ci-suite: unknown check '$check'" >&2
      exit 1
      ;;
  esac
done
