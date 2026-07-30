#!/bin/sh

hook_skip_in_ci() {
  [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]
}

hook_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null
}

hook_source_lib() {
  hooks_dir="${HOOKS_DIR:-}"
  if [ -z "$hooks_dir" ]; then
    repo_root=$(hook_repo_root)
    hooks_dir="$repo_root/.githooks"
  fi
  # shellcheck disable=SC1090  # target lib name is caller-supplied ($1); no single static path applies
  . "$hooks_dir/lib/$1"
}
