#!/bin/bash
set -eu

compute_push_range() {
  local local_sha="$1"
  if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
    return 1
  fi
  local default_branch
  default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  default_branch="${default_branch:-develop}"
  local fork_point
  fork_point=$(git merge-base "origin/${default_branch}" "$local_sha" 2>/dev/null)
  if [ -n "$fork_point" ]; then
    echo "${fork_point}..${local_sha}"
  else
    echo "origin/${default_branch}..${local_sha}"
  fi
}
