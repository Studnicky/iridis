#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
HOOKS_DIR="$(cd "$PWD/.." && pwd)"
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/dependency-install.sh
source "../lib/dependency-install.sh"

assert_seeds_env_files() {
  local repo linked
  repo=$(make_repo)
  linked=$(mktemp -d)
  echo "ROOT=1" > "$repo/.env"
  mkdir -p "$repo/apps/foo"
  echo "FOO=1" > "$repo/apps/foo/.env"
  echo "LOCAL=1" > "$repo/.env.local"
  (cd "$repo" && git worktree add -q "$linked" HEAD)

  (cd "$linked" && seed_worktree_env_files)

  assert_eq "root env seeded" "ROOT=1" "$(cat "$linked/.env")"
  assert_eq "app env seeded" "FOO=1" "$(cat "$linked/apps/foo/.env")"
  [ ! -f "$linked/.env.local" ] || fail "local env not seeded" ".env.local copied"
  pass_count=$((pass_count + 1))
  rm -rf "$repo" "$linked"
}

assert_pnpm_install_gates_on_manifest_changes() {
  local repo old new
  repo=$(make_repo)
  mkdir -p "$repo/node_modules"
  old=$(git -C "$repo" rev-parse HEAD)
  (cd "$repo" && echo '{"name":"x"}' > package.json && git add package.json && git commit -q -m bump)
  new=$(git -C "$repo" rev-parse HEAD)
  (
    cd "$repo" || exit 1
    # shellcheck source=../lib/dependency-install.sh
    source "$HOOKS_DIR/lib/dependency-install.sh"
    needs_pnpm "$old" "$new"
  )
  pass_count=$((pass_count + 1))
  rm -rf "$repo"
}

assert_dependency_install_returns_success_after_successful_install() {
  local repo old new
  repo=$(make_repo)
  mkdir -p "$repo/node_modules"
  old=$(git -C "$repo" rev-parse HEAD)
  (cd "$repo" && echo '{"name":"x"}' > package.json && git add package.json && git commit -q -m bump)
  new=$(git -C "$repo" rev-parse HEAD)
  stub_cmd "$repo" pnpm 'exit 0'
  (
    cd "$repo" || exit 1
    # shellcheck disable=SC2031  # PATH is intentionally scoped to this one command via prefix-assignment
    PATH="$repo/bin:$PATH" run_dependency_install "test" "$old" "$new" >/tmp/dependency-install.out
  )
  assert_contains "dependency install ran" "test — pnpm install --frozen-lockfile" "$(cat /tmp/dependency-install.out)"
  pass_count=$((pass_count + 1))
  rm -rf "$repo"
}

assert_seeds_env_files
assert_pnpm_install_gates_on_manifest_changes
assert_dependency_install_returns_success_after_successful_install
test_main
