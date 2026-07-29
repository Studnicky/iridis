#!/bin/sh
set -eu

# `main` must stay an ancestor of `develop`. A release branch is cut from
# `develop` and then rebased onto `main`, which only holds when main's commits
# are reachable from develop. Squash-merging a back-merge satisfies neither:
# develop ends up carrying main's content under a new commit, so main is no
# longer an ancestor and the next release branch is refused for being behind.
#
# Ancestry is the check, not commit count. A squashed back-merge leaves the two
# branches with identical trees while the ancestry is already broken.

sync_branches_are_ancestral() {
  base_ref="${1:-origin/main}"
  head_ref="${2:-origin/develop}"

  git merge-base --is-ancestor "$base_ref" "$head_ref"
}

# Prints how many commits the base holds that the head cannot reach.
sync_unreachable_count() {
  base_ref="${1:-origin/main}"
  head_ref="${2:-origin/develop}"

  git rev-list --count "${head_ref}..${base_ref}"
}

assert_sync_ancestry() {
  base_ref="${1:-origin/main}"
  head_ref="${2:-origin/develop}"

  if sync_branches_are_ancestral "$base_ref" "$head_ref"; then
    return 0
  fi

  unreachable=$(sync_unreachable_count "$base_ref" "$head_ref")
  echo "sync-check: ${base_ref} is not an ancestor of ${head_ref}; ${unreachable} commit(s) unreachable" >&2
  echo "sync-check: back-merge ${base_ref} into ${head_ref} with a merge commit — squashing recreates this" >&2
  return 1
}
