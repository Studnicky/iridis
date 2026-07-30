#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

REPO_ROOT="$(cd "$PWD/../.." && pwd)"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p .githooks scripts packages/example
  cp -R "$REPO_ROOT/.githooks/lib" .githooks/lib
  cp "$REPO_ROOT/.githooks/pre-push" .githooks/pre-push
  chmod +x .githooks/pre-push

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop
  git switch -q -c feature/staged-pre-push

  cat > scripts/hook-suite.sh <<'HOOK'
#!/bin/sh
printf '%s\n' "$1" >> hook-suite.calls
case "$1" in
  generated-artifacts) exit 1 ;;
  *) exit 0 ;;
esac
HOOK
  chmod +x scripts/hook-suite.sh

  printf '{"name":"@test/example"}\n' > packages/example/package.json
  git add -A
  git commit -q -m "feat: change package"
  local_sha=$(git rev-parse HEAD)

  if printf 'refs/heads/feature/staged-pre-push %s refs/heads/feature/staged-pre-push 0000000000000000000000000000000000000000\n' "$local_sha" | .githooks/pre-push >/tmp/pre-push-stage.out 2>&1; then
    fail "pre-push staged fail-fast" "pre-push succeeded despite generated-artifacts failure"
  fi

  assert_contains "pre-push policy ran" "generated-artifacts" "$(cat hook-suite.calls)"
  if grep -F -- "typecheck" hook-suite.calls >/dev/null 2>&1; then
    fail "pre-push validation skipped" "typecheck ran after policy stage failure"
  fi
  if grep -F -- "build" hook-suite.calls >/dev/null 2>&1; then
    fail "pre-push build skipped" "build ran after policy stage failure"
  fi
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

repo=$(make_repo release/1.0.0)
(
  cd "$repo" || exit 1
  mkdir -p .githooks scripts
  cp -R "$REPO_ROOT/.githooks/lib" .githooks/lib
  cp "$REPO_ROOT/.githooks/pre-push" .githooks/pre-push
  chmod +x .githooks/pre-push

  cat > scripts/hook-suite.sh <<'HOOK'
#!/bin/sh
printf '%s\n' "$1" >> hook-suite.calls
exit 0
HOOK
  chmod +x scripts/hook-suite.sh

  local_sha=$(git rev-parse HEAD)
  if ! printf 'refs/tags/v1.0.0 %s refs/tags/v1.0.0 0000000000000000000000000000000000000000\n' "$local_sha" | .githooks/pre-push >/tmp/pre-push-tag.out 2>&1; then
    fail "pre-push tag-only" "$(cat /tmp/pre-push-tag.out)"
  fi

  assert_contains "tag-only tests" "test" "$(cat hook-suite.calls)"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

# Branch policy reads the refs being pushed, not HEAD. Pushing a tag while the
# release branch is checked out on main must not be mistaken for pushing main.
repo=$(make_repo main)
(
  cd "$repo" || exit 1
  mkdir -p .githooks scripts
  cp -R "$REPO_ROOT/.githooks/lib" .githooks/lib
  cp "$REPO_ROOT/.githooks/pre-push" .githooks/pre-push
  chmod +x .githooks/pre-push

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop

  cat > scripts/hook-suite.sh <<'HOOK'
#!/bin/sh
printf '%s\n' "$1" >> hook-suite.calls
exit 0
HOOK
  chmod +x scripts/hook-suite.sh

  if ! printf 'refs/tags/v2.0.0 %s refs/tags/v2.0.0 0000000000000000000000000000000000000000\n' "$base_sha" | .githooks/pre-push >/tmp/pre-push-tag-on-main.out 2>&1; then
    fail "tag push from main" "$(cat /tmp/pre-push-tag-on-main.out)"
  fi

  assert_not_contains "tag push is not treated as a main push" "protected branch" "$(cat /tmp/pre-push-tag-on-main.out)"
  assert_not_contains "tag push skips release gates" "release-gates" "$(cat hook-suite.calls)"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

# A branch push is still judged by the branch in the push, so main stays refused
# even when some other branch is checked out.
repo=$(make_repo feature/holding)
(
  cd "$repo" || exit 1
  mkdir -p .githooks scripts
  cp -R "$REPO_ROOT/.githooks/lib" .githooks/lib
  cp "$REPO_ROOT/.githooks/pre-push" .githooks/pre-push
  chmod +x .githooks/pre-push

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop

  if printf 'refs/heads/main %s refs/heads/main 0000000000000000000000000000000000000000\n' "$base_sha" | .githooks/pre-push >/tmp/pre-push-main-ref.out 2>&1; then
    fail "main ref push refused" "pre-push allowed a push of refs/heads/main"
  fi

  assert_contains "main ref push names the protected branch" "protected branch 'main'" "$(cat /tmp/pre-push-main-ref.out)"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

# Deleting a merged branch pushes no commits, so there is no diff to validate;
# the hook must skip the full suite rather than assume everything changed.
repo=$(make_repo feature/holding)
(
  cd "$repo" || exit 1
  mkdir -p .githooks scripts
  cp -R "$REPO_ROOT/.githooks/lib" .githooks/lib
  cp "$REPO_ROOT/.githooks/pre-push" .githooks/pre-push
  chmod +x .githooks/pre-push

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop

  cat > scripts/hook-suite.sh <<'HOOK'
#!/bin/sh
printf '%s\n' "$1" >> hook-suite.calls
exit 0
HOOK
  chmod +x scripts/hook-suite.sh

  if ! printf '(delete) 0000000000000000000000000000000000000000 refs/heads/fix/done-with-this %s\n' "$base_sha" | .githooks/pre-push >/tmp/pre-push-delete.out 2>&1; then
    fail "branch deletion push" "$(cat /tmp/pre-push-delete.out)"
  fi

  assert_contains "deletion push short-circuits" "deletion-only push" "$(cat /tmp/pre-push-delete.out)"
  if [ -f hook-suite.calls ]; then
    fail "deletion push ran the suite" "$(cat hook-suite.calls)"
  fi
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

# A real delete-shaped push reports local_ref as "(delete)", not the ref path.
# Branch identity must still resolve from remote_ref so deleting main is
# refused rather than silently falling through as an unrecognized ref.
repo=$(make_repo feature/holding)
(
  cd "$repo" || exit 1
  mkdir -p .githooks scripts
  cp -R "$REPO_ROOT/.githooks/lib" .githooks/lib
  cp "$REPO_ROOT/.githooks/pre-push" .githooks/pre-push
  chmod +x .githooks/pre-push

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop

  if printf '(delete) 0000000000000000000000000000000000000000 refs/heads/main %s\n' "$base_sha" | .githooks/pre-push >/tmp/pre-push-main-delete.out 2>&1; then
    fail "main deletion refused" "pre-push allowed deleting refs/heads/main"
  fi

  assert_contains "main deletion names the protected branch" "protected branch 'main'" "$(cat /tmp/pre-push-main-delete.out)"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

test_main
