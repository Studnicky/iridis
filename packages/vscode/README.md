# @studnicky/iridis-vscode

Generates a complete VS Code `theme.json` (workbench `colors`,
`semanticTokenColors`, and `tokenColors` rules) from a 16-role palette. The
plugin ships the canonical `vscodeRoleSchema16` schema and a five-task pipeline
that lifts the raw palette into a full editor theme.

Wide-gamut roles (records with `displayP3` populated) serialise to
`color(display-p3 r g b)` strings in every emitted theme slot; sRGB-only roles
stay as `#rrggbb` hex. VS Code 1.85+ accepts the CSS Color 4 form in any colour
slot.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-vscode
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import {
  vscodePlugin,
  vscodeRoleSchema16,
} from '@studnicky/iridis-vscode';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(vscodePlugin);

engine.pipeline([
  'intake:hex',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson',
]);

const state = await engine.run({
  'colors':   ['#8B5CF6', '#EC4899', '#0d1117', '#e6edf3' /* ...16 seeds */ ],
  'roles':    vscodeRoleSchema16,
  'metadata': { 'themeName': 'Iridis Dark' },
});

const out = state.outputs['vscode']!;
const themeJson = out.themeJson;
// themeJson.colors:              workbench Record<string, string>
// themeJson.semanticTokenColors: Record<string, string | { foreground, fontStyle }>
// themeJson.tokenColors:         TokenColorRule[] driven by SCOPE_MAPPINGS
```

## Tasks

| Name | Role |
|---|---|
| `vscode:expandTokens` | Materialises 23 base tokens from the resolved 16-role palette. |
| `vscode:applyModifiers` | Applies 10 colour modifiers to the base tokens, producing 253 semantic-token rules and re-enforcing contrast against the background role. |
| `emit:vscodeSemanticRules` | Shapes `state.outputs.vscode.semanticTokenRules` from the modifier output. Maps onto `editor.semanticTokenColorCustomizations.rules`. |
| `emit:vscodeUiPalette` | Writes `state.outputs.vscode.workbenchColors` covering 100+ workbench slots (`editor.background`, `sideBar.foreground`, ...). Selects light/dark variants via the resolved `background` luminance. |
| `emit:vscodeThemeJson` | Composes the previous outputs into a single `theme.json` ready for the `themes` array in `package.json`. Requires `emit:vscodeSemanticRules` AND `emit:vscodeUiPalette`. |

`state.outputs['vscode']` is typed as `VscodeOutputSlotInterface` and carries
the three optional slots (`workbenchColors`, `semanticTokenRules`, `themeJson`)
so any subset of the emit tasks can run independently — the final
`emit:vscodeThemeJson` task fails fast if its dependencies were not run.

Part of [iridis](https://github.com/Studnicky/iridis).
