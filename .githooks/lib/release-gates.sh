#!/bin/bash
set -eu

release_root_version() {
  node -p "require('./package.json').version"
}

assert_workspace_lockstep_version() {
  local expected_version="$1" mismatch pkg_json pkg_name pkg_ver pkg_private
  mismatch=0

  for pkg_json in packages/*/package.json; do
    pkg_private=$(node -p "require('./${pkg_json}').private || false")
    # Private packages (e.g. design-system-contracts) are excluded from the
    # fixed lockstep group in .changeset/config.json and version independently.
    [ "$pkg_private" = "true" ] && continue

    pkg_name=$(node -p "require('./${pkg_json}').name")
    pkg_ver=$(node -p "require('./${pkg_json}').version")
    if [ "$pkg_ver" != "$expected_version" ]; then
      echo "::error::${pkg_name}@${pkg_ver} is not at version ${expected_version}" >&2
      mismatch=1
    fi
  done

  return "$mismatch"
}

assert_no_pending_changesets() {
  local pending
  pending=$(find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md' | wc -l | tr -d ' ')
  if [ "$pending" -ne 0 ]; then
    echo "::error::${pending} unconsumed changeset(s) remain in .changeset/ — run 'pnpm changeset:version' and commit the result before tagging." >&2
    return 1
  fi
}

assert_changeset_required() {
  local pending
  pending=$(find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md' | wc -l | tr -d ' ')
  if [ "$pending" -eq 0 ]; then
    echo "ERROR: No changeset found for this PR." >&2
    echo "Run 'pnpm changeset' and commit the generated .changeset/*.md file before merging to main." >&2
    return 1
  fi
}
