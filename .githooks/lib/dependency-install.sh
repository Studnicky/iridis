#!/bin/bash
set -o pipefail

_main_worktree_path() {
    while IFS= read -r line; do
        case "$line" in
            "worktree "*)
                (cd "${line#worktree }" 2>/dev/null && pwd -P) && return
                ;;
        esac
    done < <(git worktree list --porcelain 2>/dev/null)
}

seed_worktree_env_files() {
    local dest_root src_root
    dest_root=$(git rev-parse --show-toplevel 2>/dev/null) || return 0
    src_root=$(_main_worktree_path)
    [ -n "$src_root" ] || return 0
    [ "$src_root" = "$(cd "$dest_root" && pwd -P)" ] && return 0

    local candidates=("$src_root/.env")
    local app_env
    for app_env in "$src_root"/apps/*/.env; do
        [ -f "$app_env" ] && candidates+=("$app_env")
    done

    local src dest rel
    for src in "${candidates[@]}"; do
        [ -f "$src" ] || continue
        rel="${src#"$src_root"/}"
        case "$rel" in
            *.local|*.local.*) continue ;;
        esac
        dest="$dest_root/$rel"
        [ -f "$dest" ] && continue
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        echo "  -> seeded ${rel} from ${src_root}"
    done
}

needs_pnpm() {
    local old="$1" new="$2" root
    root=$(git rev-parse --show-toplevel 2>/dev/null) || return 1
    [ ! -d "$root/node_modules" ] && return 0
    [ -z "$old" ] || [ "$old" = "0000000000000000000000000000000000000000" ] && return 0
    [ -z "$new" ] || [ "$old" = "$new" ] && return 1
    git -C "$root" diff --name-only "$old" "$new" 2>/dev/null | grep -Eq '(^|/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc)$'
}

run_with_deadline() {
    local seconds="$1"; shift
    command -v perl >/dev/null 2>&1 || return 125
    perl -MPOSIX=setsid -e 'setsid(); exec @ARGV' "$@" &
    local pid=$!
    local deadline=$((SECONDS + seconds))
    while kill -0 "$pid" 2>/dev/null; do
        if [ "$SECONDS" -ge "$deadline" ]; then
            kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
            sleep 1
            kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
            wait "$pid" 2>/dev/null
            return 124
        fi
        sleep 0.2
    done
    wait "$pid"
    local rc=$?
    case "$rc" in
        137|143) return 124 ;;
        *) return "$rc" ;;
    esac
}

run_dependency_install() {
    local context="${1:-git hook}" old="${2:-}" new="${3:-}"
    local timeout="${DEPENDENCY_INSTALL_TIMEOUT_SECONDS:-300}"
    local root
    root=$(git rev-parse --show-toplevel 2>/dev/null) || return 0

    if ! command -v perl >/dev/null 2>&1; then
        echo "  ⚠ perl not found — skipping bounded dependency install."
        return 0
    fi

    export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
    [ -d "$HOME/Library/Application Support/Herd/bin" ] && export PATH="$PATH:$HOME/Library/Application Support/Herd/bin"

    if needs_pnpm "$old" "$new"; then
        if command -v pnpm >/dev/null 2>&1; then
            echo "  -> ${context} — pnpm install --frozen-lockfile"
            (cd "$root" && run_with_deadline "$timeout" pnpm install --frozen-lockfile)
            local rc=$?
            if [ $rc -eq 124 ]; then
                echo "  ⚠ pnpm install timed out (>${timeout}s) — run manually."
            elif [ $rc -ne 0 ]; then
                echo "  ⚠ pnpm install failed (exit ${rc}) — run manually."
            fi
        else
            echo "  ⚠ pnpm not found — run manually: pnpm install --frozen-lockfile"
        fi
    fi

    return 0
}
