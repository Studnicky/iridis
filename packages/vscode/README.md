# @studnicky/iridis-vscode

Generate a portable VS Code `theme.json` from an explicitly framed, tiered palette. The plugin resolves a 64-role vocabulary, emits 129 registry-backed workbench colours, semantic-token rules, and TextMate token colours. Every emitted colour is sRGB `#RRGGBB` or `#RRGGBBAA`.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-contrast @studnicky/iridis-vscode
```

Packages publish through GitHub Packages. Configure npm with a token that has `read:packages` access:

```ini
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import {
  VSCODE_ROLE_SCHEMAS_64,
  vscodePlugin
} from '@studnicky/iridis-vscode';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(vscodePlugin);
engine.adopt(contrastPlugin);
engine.pipeline([
  'vscode:seedRoles',
  'resolve:roles',
  'expand:family',
  'vscode:deriveUiRoles',
  'enforce:compliance',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson'
]);

const state = engine.run({
  'bypass': undefined,
  'colors': [{
    'tier': 4,
    'framing': 'dark',
    'roles': {
      'background': '#101820',
      'foreground': '#f5f7fa',
      'keyword': '#7c3aed',
      'error': '#ef4444'
    }
  }],
  'contrast': { 'algorithm': 'wcag21', 'cvdMode': 'nudge', 'extra': undefined, 'level': 'AA' },
  'emit': undefined,
  'maxColors': undefined,
  'metadata': { 'themeName': 'Iridis Dark' },
  'roles': VSCODE_ROLE_SCHEMAS_64.dark,
  'runtime': { 'colorSpace': undefined, 'extra': undefined, 'framing': 'dark' }
});

const themeJson = state.outputs['vscode:themeJson'];
```

`vscode:seedRoles` requires exactly one object in `input.colors`. Its `framing` must equal `input.runtime.framing`; it rejects extra, missing, or malformed role keys. Roles supplied by name remain caller-stated and exact, while the core pipeline derives missing roles. `metadata['core:roleProvenance']` records each role's origin and ordered adjustment evidence. `metadata['core:contrastReport']` records every declared contrast result; it reports a failed caller-stated pair without changing that colour.

## Schemas and tiers

Use `VSCODE_ROLE_SCHEMAS_64.dark` or `.light` for the declared framing. The schemas are explicit dark and light role definitions; light themes are generated through the light schema, not by inverting a dark output. `VSCODE_ROLE_SCHEMAS_16` exports a 16-role view of the same canonical definitions.

| Tier | Exact supplied roles |
|---|---|
| 4 | `background`, `foreground`, `keyword`, `error` |
| 8 | Tier 4 plus `type`, `function`, `number`, `constant` |
| 16 | `background`, `foreground`, `surface`, `muted`, `keyword`, `type`, `function`, `variable`, `string`, `number`, `constant`, `comment`, `error`, `warning`, `info`, `success` |
| 64 | The 16 base roles plus accent, UI, ANSI, Git, diff, bracket, and widget roles declared by `VSCODE_ROLE_SCHEMAS_64` |

The schema declares WCAG pairs for foreground, muted text, syntax roles, status colours, `onAccent`, links, and chrome foreground. It also declares bounded pairs for `surface` and `accent`. The VS Code plugin consumes the same engine and the same `input.contrast` configuration as every other output. `enforce:compliance` applies the selected standard to these pairs and adjusts derived roles; a pair whose endpoints are both caller-stated is reported without changing either colour.

## Tasks

| Task | Purpose |
|---|---|
| `vscode:seedRoles` | Validates the structured tiered palette and creates named caller-stated seed records. |
| `vscode:deriveUiRoles` | Derives absent UI extension roles while preserving caller-stated roles. |
| `vscode:expandTokens` | Builds 27 syntax and TextMate base tokens from the resolved framing surface. |
| `vscode:applyModifiers` | Generates semantic token rules and enforces their background contrast. |
| `emit:vscodeSemanticRules` | Writes `outputs['vscode:semanticTokenRules']`. |
| `emit:vscodeUiPalette` | Writes `outputs['vscode:workbenchColors']` from the 64-role vocabulary. |
| `emit:vscodeThemeJson` | Combines workbench, semantic, and TextMate token output into `outputs['vscode:themeJson']`. |

`emit:vscodeThemeJson` requires both preceding emit tasks. The two emit tasks may run in either order after their own prerequisites.

Part of [iridis](https://github.com/Studnicky/iridis).
