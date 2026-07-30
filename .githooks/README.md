# Git Hooks

This repository installs its hooks through `scripts/install-hooks.sh`.

Available local checks:

- `pre-commit`: staged secret scan plus `lint-staged`
- `commit-msg`: conventional commit subject check
- `post-checkout`: branch-name warning, worktree env seeding, dependency refresh
- `post-merge`: dependency refresh and stale worktree cleanup
- `post-rewrite`: dependency refresh after rebases
- `pre-push`: branch policy, rebase gate, changeset/version checks, dependency audit, typecheck, lint, test, build, semgrep, dependency graph blast radius

Useful commands:

- `pnpm run setup-hooks`
- `pnpm run test:hooks`
- `pnpm run worktree:clean`
