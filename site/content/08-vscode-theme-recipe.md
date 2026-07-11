---
title: 8. VS Code Theme Recipe
description: How the VS Code plugin runs a second engine pass to derive a full editor theme from a 16-role palette.
---

`@studnicky/iridis-vscode` derives a complete VS Code `theme.json` — workbench `colors`, `semanticTokenColors`, and `tokenColors` — from a 16-role palette. It's a five-task pipeline extension, not a single emit task, because a VS Code theme has more surface area than a CSS variable block: workbench chrome, editor syntax highlighting, and the newer semantic-token layer all need independently-derived color sets that then get assembled together.

## Why a second engine pass

The plugin's tasks run *after* the core pipeline resolves roles and enforces contrast — `vscode:expandTokens` and `vscode:applyModifiers` are their own mini-pipeline stage that takes the resolved 16-role palette and expands it into VS Code's much larger color vocabulary (23 base tokens, then 253 semantic-token rules), re-checking contrast against the background role as it goes. This is the "second engine pass" referenced in `MultiOutput.vue`: the core pipeline produces a role palette sized for UI theming; the VS Code plugin then derives an editor-theme-sized palette from that role palette using its own derivation tables (`DERIVATION_PARAMS`, `MODIFIER_TRANSFORMS`, `SCOPE_MAPPINGS`) rather than reusing `derive:variant`.

## Pipeline stages

| Stage | Task | What it does |
|---|---|---|
| 1 | `vscode:expandTokens` | Derives 23 VS Code base token colors from the 16 resolved roles, using `DERIVATION_PARAMS`. Writes `metadata['vscode:baseTokens']`. |
| 2 | `vscode:applyModifiers` | Applies 10 color modifiers (from `MODIFIER_TRANSFORMS`) to the base tokens, producing 253 semantic-token rules, and re-enforces contrast against the `background` role for each. Writes `metadata['vscode:semanticTokenRules']`. |
| 3a | `emit:vscodeSemanticRules` | Shapes the semantic-token rule map for `editor.semanticTokenColorCustomizations.rules`, using `SCOPE_MAPPINGS` and `FONT_STYLES`. Writes `outputs['vscode:semanticTokenRules']`. |
| 3b | `emit:vscodeUiPalette` | Derives 100+ workbench UI colors (`editor.background`, `sideBar.foreground`, etc.) from the 16-role palette, selecting light/dark variants by the resolved `background` luminance. Writes `outputs['vscode:workbenchColors']`. |
| 4 | `emit:vscodeThemeJson` | Combines the semantic rules and workbench colors into one `theme.json` shape (`{ name, type, colors, semanticTokenColors, tokenColors }`). Requires both `emit:vscodeSemanticRules` and `emit:vscodeUiPalette` to have already run. Writes `outputs['vscode:themeJson']`. |

Stages 3a and 3b are independent of each other and can run in either order (both depend only on stage 2's output), but stage 4 fails fast if either hasn't run yet.

Wide-gamut roles (records with `displayP3` populated) serialize to the CSS Color 4 `color(display-p3 r g b)` form in every emitted theme slot; sRGB-only roles stay as `#rrggbb`. VS Code 1.85+ accepts either form in any color slot.

## Producing a theme file

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { vscodePlugin, vscodeRoleSchema16 } from '@studnicky/iridis-vscode';
import { writeFileSync } from 'node:fs';

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
  colors: ['#8B5CF6', '#EC4899', '#0d1117', '#e6edf3' /* ...16 seeds, one per vscodeRoleSchema16 role */],
  roles: vscodeRoleSchema16,
  metadata: { themeName: 'Iridis Dark' },
});

const themeJson = state.outputs['vscode:themeJson']!;
writeFileSync('themes/iridis-dark-color-theme.json', JSON.stringify(themeJson, null, 2));
```

`vscodeRoleSchema16` is the canonical 16-role schema the plugin expects — pass 16 seed colors matching its roles, in order.

## Loading it as a VS Code extension theme

The written file is a standard VS Code color theme contribution. Reference it from an extension's `package.json`:

```json
{
  "name": "iridis-dark-theme",
  "contributes": {
    "themes": [
      {
        "label": "Iridis Dark",
        "uiTheme": "vs-dark",
        "path": "./themes/iridis-dark-color-theme.json"
      }
    ]
  }
}
```

For local testing without publishing an extension, symlink or copy the generated `theme.json` into an existing theme extension's `themes/` directory, or load the workspace folder in VS Code's Extension Development Host (`F5`) with the `package.json` above.
