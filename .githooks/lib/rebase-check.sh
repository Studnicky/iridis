#!/bin/bash
set -eu

rebase_base_for_branch() {
  case "$1" in
    hotfix/*|release/*) echo main ;;
    *) echo "$2" ;;
  esac
}

push_has_gatable_ref() {
  local default_branch="$1"
  local local_ref local_sha _remote_ref _remote_sha
  while read -r local_ref local_sha _remote_ref _remote_sha; do
    case "$local_ref" in
      refs/heads/*) ;;
      *) continue ;;
    esac
    [ "$local_sha" = "0000000000000000000000000000000000000000" ] && continue
    [ "${local_ref#refs/heads/}" = "$default_branch" ] && continue
    return 0
  done
  return 1
}

check_rebased_onto_base() {
  local base_branch="$1"
  local sha="${2:-HEAD}"
  local label="${3:-Branch}"

  if ! git show-ref --verify --quiet "refs/remotes/origin/${base_branch}"; then
    echo "  ⚠ origin/${base_branch} not available locally — skipping rebase check (CI will enforce it)"
    return 0
  fi

  if git merge-base --is-ancestor "origin/${base_branch}" "$sha"; then
    return 0
  fi

  echo "  ❌ ${label} is behind origin/${base_branch} — rebase before pushing:"
  echo "     git fetch origin ${base_branch} && git rebase origin/${base_branch}"
  return 1
}
