# @studnicky/eslint-config

> Custom ESLint rule plugin for @studnicky packages

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/eslint-config)

Custom ESLint rule plugin that ships two namespaced rule sets for TypeScript projects. Register `plugin` and `v8Plugin` in your flat config and enable the rules you want.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add -D @studnicky/eslint-config
```

Also install peer dependencies:

```sh
pnpm add -D eslint@>=10 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=5 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=5 eslint-plugin-regexp@>=3 eslint-plugin-unused-imports@>=4 typescript@>=6
```

## Usage

```js
// eslint.config.mjs
import { plugin, v8Plugin } from '@studnicky/eslint-config';

export default [
  {
    plugins: {
      '@studnicky': plugin,
      '@studnicky/v8': v8Plugin
    },
    rules: {
      '@studnicky/type-alias-must-end-type': 'error',
      '@studnicky/single-export': 'error',
      '@studnicky/no-trivial-shim': 'error',
      '@studnicky/v8/no-spread-in-loops': 'error'
    }
  }
];
```

Import plugins from the dedicated subpath entries if you only need one namespace:

```js
// eslint.config.mjs
import { plugin } from '@studnicky/eslint-config/plugin';
import { v8Plugin } from '@studnicky/eslint-config/v8';
```

## Custom rules

**`@studnicky` namespace** (14 rules via `plugin` from `@studnicky/eslint-config/plugin`):

| Rule | Purpose |
|------|---------|
| `@studnicky/no-bind-apply-call` | Disallows `.bind()`, `.apply()`, and `.call()` on functions |
| `@studnicky/no-suppression-comments` | Disallows lint, type, and coverage suppression comments |
| `@studnicky/no-trivial-shim` | Flags thin wrapper functions that add no behavior |
| `@studnicky/single-export` | Enforces one named export per regular file, with restricted-topology exemptions and SCREAMING_SNAKE_CASE constant modules |

**`@studnicky/v8` namespace** (16 rules via `v8Plugin` from `@studnicky/eslint-config/v8`):

| Rule | Purpose |
|------|---------|
| `@studnicky/v8/no-spread-in-loops` | Avoid spread operators inside loops |
| `@studnicky/v8/for-of-arrays` | Prefer `for` / `for-of` over `forEach` on arrays |

Full rule reference: https://studnicky.github.io/substrate/packages/eslint-config

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/eslint-config

## License

MIT
