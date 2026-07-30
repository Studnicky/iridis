#!/bin/bash
set -o pipefail

# shellcheck source=dependency-install.sh
source "$(dirname "${BASH_SOURCE[0]}")/dependency-install.sh"

_iter_worktrees() {
    local wt="" branch="" is_bare=""
    while IFS= read -r line; do
        case "$line" in
            "worktree "*)
                [ -n "$wt" ] && [ -z "$is_bare" ] && [ -n "$branch" ] && printf '%s\t%s\n' "$wt" "$branch"
                wt="${line#worktree }"; branch=""; is_bare=""
                ;;
            "branch refs/heads/"*) branch="${line#branch refs/heads/}" ;;
            "bare") is_bare="1" ;;
        esac
    done < <(git worktree list --porcelain 2>/dev/null)
    [ -n "$wt" ] && [ -z "$is_bare" ] && [ -n "$branch" ] && printf '%s\t%s\n' "$wt" "$branch"
}

_branch_upstream_gone() {
    git for-each-ref --format='%(upstream:track)' "refs/heads/$1" 2>/dev/null | grep -q '\[gone\]'
}

_branch_has_upstream() {
    git config --get "branch.$1.merge" >/dev/null 2>&1
}

_branch_merged_into_any() {
    local branch="$1"; shift
    local target
    for target in "$@"; do
        git show-ref --verify --quiet "refs/heads/${target}" || continue
        git merge-base --is-ancestor "$branch" "$target" 2>/dev/null && return 0
    done
    return 1
}

_worktree_dirty() {
    [ -n "$(git -C "$1" status --porcelain --ignore-submodules=all 2>/dev/null)" ]
}

_worktree_state() {
    local path="$1" branch="$2" primary="$3" cwd="$4"
    shift 4
    local targets=("$@") t

    if [ "$path" = "$primary" ] || [ "$path" = "$cwd" ]; then
        echo protected
        return
    fi
    for t in "${targets[@]}"; do
        if [ "$t" = "$branch" ]; then
            echo protected
            return
        fi
    done

    if ! _branch_has_upstream "$branch"; then
        echo local-only
        return
    fi

    local merged=false
    _branch_merged_into_any "$branch" "${targets[@]}" && merged=true
    if [ "$merged" = false ] && ! _branch_upstream_gone "$branch"; then
        echo active
        return
    fi

    if _worktree_dirty "$path"; then
        echo dirty
        return
    fi

    if [ "$merged" = true ]; then
        echo merged
    else
        echo gone-unmerged
    fi
}

find_stale_worktrees() {
    local targets=("$@")
    [ ${#targets[@]} -eq 0 ] && targets=(develop main)

    local primary cwd
    primary=$(_main_worktree_path)
    cwd=$(pwd -P)

    local path branch resolved_path state
    while IFS=$'\t' read -r path branch; do
        resolved_path=$(cd "$path" 2>/dev/null && pwd -P) || resolved_path="$path"
        state=$(_worktree_state "$resolved_path" "$branch" "$primary" "$cwd" "${targets[@]}")
        case "$state" in
            merged|gone-unmerged)
                printf '%s\t%s\t%s\n' "$path" "$branch" "$state"
                ;;
            dirty)
                echo "  ⚠ skipping '${branch}' (${path}) — uncommitted changes" >&2
                ;;
        esac
    done < <(_iter_worktrees)
}

cleanup_stale_worktrees() {
    local dry_run="${1:-false}"
    [ $# -gt 0 ] && shift
    local targets=("$@")
    [ ${#targets[@]} -eq 0 ] && targets=(develop main)

    local path branch state
    while IFS=$'\t' read -r path branch state; do
        [ -z "$path" ] && continue

        if [ "$dry_run" = "true" ]; then
            echo "  -> would remove stale worktree '${branch}' (${path})"
            continue
        fi

        if ! git worktree remove "$path" 2>/dev/null; then
            echo "  ⚠ failed to remove worktree '${branch}' (${path}) — leaving in place" >&2
            continue
        fi

        case "$state" in
            merged)
                git branch -D "$branch" >/dev/null 2>&1
                echo "  -> removed stale worktree '${branch}' (${path})"
                ;;
            gone-unmerged)
                echo "  -> removed stale worktree '${branch}' (${path}); branch kept — delete manually if desired"
                ;;
        esac
    done < <(find_stale_worktrees "${targets[@]}")

    return 0
}
