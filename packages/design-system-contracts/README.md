# Design-System Contracts

Design-system class and CSS-token contract validators and an ESLint plugin
for the iridis site (Nuxt 4 / Vue). Plain `.mjs`, no build step, no
dependencies beyond `node:fs/promises` — ESLint is duck-typed via the
`context` object it hands rules, never imported by the core module.

- static class-token validation from CSS class declarations
- dynamic class-expression allowlisting (registered by expression base)
- CSS custom-property (design-token) validation: no undefined tokens, no
  literal colors, no token fallbacks, no hardcoded border style/radius
- parser-native ESLint enforcement for Vue (`:class`/`class` bindings), via
  `vue-eslint-parser`'s template-body visitor when available
- explicit generic HTML-template and runtime (plain JS/TS `classList`/
  `className` assignment) validation for contexts without a native AST path

## Public API

### `collectDesignSystemClassNames(paths)`

- `paths`: string array of CSS/Vue file paths
- returns `Promise<Set<string>>`

Scrapes `.foo-bar` class selectors out of the given files' raw text. This is
the design system's CSS acting as the allowlist — nothing hand-maintained.

### `collectDesignSystemTokenNames(paths)`

- `paths`: string array of CSS file paths
- returns `Promise<Set<string>>`

Scrapes `--foo-bar:` custom-property definitions out of the given files.
Feed this the site's own token-defining stylesheets to build the
`designTokens` allowlist for `known-design-tokens`.

### `validateStaticClassUsage(text, classNames, options?)`

Validates concrete class tokens inside `class`/`className`-like attributes
and object properties. `options.frameworks` scopes which extractor patterns
apply — a string, array, or `Set` of `vue`, `runtime`, or `html`. Passing an
unsupported context name throws.

Tokens containing `${`, `{{`, `?`, `:`, starting with `http`, or **not
containing a hyphen** are skipped — computed or non-hyphenated tokens are
outside static reach (see the note on iridis class-naming below).

### `validateDynamicClassUsage(text, dynamicContracts, classNames, options?)`

Validates interpolated class values, `classList` arguments, and
template-literal expressions against a dynamic allowlist keyed by
expression base (see `extractDynamicExpressionBase`). `dynamicContracts`
values are `RegExp`s documenting intent for the base's resolved output —
membership in the map is what's actually enforced (`Map#has(base)`); the
regex itself is not evaluated against anything at validation time.

### `validateDesignSystemUsage({ text, designSystemClassNames, dynamicClassExpressionContracts, frameworks })`

Runs static and dynamic class checks and returns
`{ staticIssues, dynamicIssues, isValid }`.

### `validateDesignTokenUsage(text, definedTokens, options?)`

Runs the `known-design-tokens` checks as a pure function and returns an
issue array. Checks, independent of each other:

- every `var(--foo)` reference resolves to a token in `definedTokens` (only
  enforced when `definedTokens` is non-empty)
- no `var(--foo, fallback)` fallback values
- no literal colors (`#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()`)
- no hardcoded `border`/`outline` style (`dashed`/`dotted`/`solid`)
- no hardcoded `border-radius` length values

### `createDesignSystemPlugin(config)`

Returns a standard ESLint plugin object with three rules:

- `known-class-names`
- `known-dynamic-class-expr`
- `known-design-tokens`

### `getDesignSystemEslintPlugin(config)`

Returns a flat-config-compatible ESLint config block: `plugins['design-system-contracts']`
plus an enabled-rules map. Config keys:

- `classNames`: `Set<string>` of known classes
- `dynamicClassExpressionContracts`: contract map/object for dynamic expressions
- `designTokens`: `Set<string>` of known CSS custom-property names
- `frameworks`: optional context selector (`vue`, `runtime`, `html`) to scope
  extractor subsets
- `rules`: optional array of rule ids to enable (defaults to all three) —
  used by `design-tokens.mjs` to enable only `known-design-tokens`

### Profiles

Each profile accepts `{ classNames, dynamicClassExpressionContracts, designTokens, files?, rules? }`
and returns one flat ESLint config block:

- `@studnicky/iridis-design-system-contracts/vue`: `createVueDesignSystemLintConfig` — `**/*.vue`, native `vue-eslint-parser` AST visitor for `class`/`:class`
- `@studnicky/iridis-design-system-contracts/design-tokens`: `createDesignTokenDesignSystemLintConfig` — `**/*.css`, `known-design-tokens` only
- `@studnicky/iridis-design-system-contracts/runtime`: `createRuntimeDesignSystemLintConfig` — `**/*.{js,mjs,cjs,ts,mts,cts}`, plain script `classList`/`className` assignment
- `@studnicky/iridis-design-system-contracts/html`: `validateHtmlDesignSystemUsage` — generic HTML-template validator function (not an ESLint profile), for contexts without a native AST path

### `./contracts.mjs`

iridis-specific, not part of the generic core: `IRIDIS_DYNAMIC_CLASS_EXPRESSION_CONTRACTS`
(dynamic bases the site's chrome components compute, e.g. `tone` for
`` `ui-code-block--${tone}` ``) and `IRIDIS_DESIGN_TOKENS` (a static snapshot
of the tokens `main.css` and the pipeline's theme wiring define — prefer
`collectDesignSystemTokenNames` against the live stylesheets when wiring
into `eslint.config.mjs`). Also re-exports the expression-base helpers from
`index.mjs` so there is exactly one implementation of each, not a duplicate
per consumer.

## Example usage

```js
import { createDesignSystemPlugin } from '@studnicky/iridis-design-system-contracts'

export const designSystemLint = {
  plugins: {
    'design-system-contracts': createDesignSystemPlugin({
      classNames: new Set(['ui-code-block', 'ui-code-block--source']),
      dynamicClassExpressionContracts: new Map([
        ['tone', /^(?:default|source|error)$/]
      ]),
      designTokens: new Set(['--ui-text', '--ui-border', '--iridis-radius-md'])
    })
  },
  rules: {
    'design-system-contracts/known-class-names': 'error',
    'design-system-contracts/known-dynamic-class-expr': 'error',
    'design-system-contracts/known-design-tokens': 'error'
  }
}
```

## Adaptation notes (from the schema-forms source)

This package was copied from `schema-forms/packages/design-system-contracts`
and trimmed for iridis's actual stack and CSS-naming conventions:

- **Framework visitors**: iridis's site is Nuxt 4 / Vue only. The Angular,
  Lit, React, Solid, and Svelte AST visitors, their profile files, and their
  export subpaths are removed — those carried implied parser peer
  dependencies the source package never declared.
- **schema-forms "tools" concept removed**: `DESIGN_SYSTEM_SUPPORTED_TOOLS`
  (`async-cancellation`/`cli`/`standard-validation`/`validator-registry`)
  were schema-forms demo-page names baked in as first-class contexts, each
  with its own export subpath and profile file, routed through a
  `DESIGN_SYSTEM_CONTEXT_ALIASES` map and an `inferDesignSystemTemplateContext`
  filename resolver. None of it applies to iridis; all of it is gone. Plain
  `runtime` (script-level `className =`/`classList.add(...)` assignment) is
  kept as a first-class generic context — it isn't a schema-forms demo name,
  it's a real JS/TS runtime pattern iridis composables can hit.
- **Layer policy removed, not re-expressed**: the source hard-coded an
  `atoms`/`molecules`/`organisms` vocabulary with `atom-`/`molecule-`/`organism-`
  prefix matching. iridis's real chrome classes
  (`ui-code-block__header`, `ui-tabs__badge--live`, `dagonizer-viewer-overlay--loading`)
  are BEM (`block__element--modifier`), not atomic-design tiers — there is no
  layering concept to enforce, so `normalizeLayerPolicy`,
  `getDesignSystemLayerByToken`, `createLayeredDesignSystemPluginConfig`, and
  the `layerPolicy`/`classLayer`/`allowLayers`/`denyLayers` options are
  removed rather than carried forward unused.
- **No-hyphen skip limitation carries real weight here**: the static class
  extractor silently skips any token not containing a hyphen. iridis's own
  `site/app/assets/css/main.css` defines real, single-word classes —
  `.glass`, `.float`, `.preload`, `.prose`, `.pulse`, `.scanlines` — that
  `known-class-names` cannot enforce. This is inherited from the source
  package's design and not something this adaptation fixes; consumers
  should be aware these classes are unenforceable by this tool.
- **`known-design-tokens` is new** (iridis has no CSS-custom-property
  concept in the source package at all — schema-forms deliberately excludes
  `tokens.css` from its input). It expresses the invariant
  `site/test/siteDesignSystemCss.test.ts` enforces today via a hardcoded
  12-file `CHROME_STYLESHEETS` allowlist, as a real per-file ESLint rule
  instead — no allowlist maintenance, every matched file is checked
  automatically.
- **Duplicated helpers**: the source's `demos/design-system/contracts.mjs`
  reimplemented `normalizeDynamicClassExpression`, `extractDynamicClassExpressionBase`,
  `isKnownConditionalDynamicClassExpression`, and `isKnownDynamicClassExpression`
  with slightly different signatures than `index.mjs`'s own copies. iridis's
  `contracts.mjs` re-exports the `index.mjs` versions instead of
  reimplementing them.
- **`eslint` peer dependency**: the source package declared zero
  dependencies at all, including for the ESLint plugin surface it ships —
  latent if ever published. This package declares `eslint` as a
  `peerDependency`.

Not yet wired into `eslint.config.mjs` — this package exists standalone
pending a separate wiring pass.
