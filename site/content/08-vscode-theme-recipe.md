---
title: VS Code Theme Recipe
description: Generate a framed VS Code theme from a tiered palette.
---

`@studnicky/iridis-vscode` emits a complete VS Code `theme.json`: workbench `colors`, semantic token rules, and TextMate `tokenColors`. It accepts a named palette at a supported tier, resolves the schema vocabulary, and emits sRGB hex values compatible with VS Code theme colour slots.

## Use the interactive demonstrator

The [home-page demonstrator](/) makes the theme-generation model inspectable before it becomes a file. Select a palette and supported tier, edit its structured `roles` object, set the shared framing, inspect the generated preview and compliance evidence, then copy or download the emitted `theme.json`.

A presentation preset changes the site’s typography and surface treatment. It does not change the semantic palette. The shared framing switch controls both the site color system and the emitted VS Code theme, so light and dark output remain an understandable state rather than independent settings.

Each tier accepts its exact role set. Changing the tier replaces the editor fields with that set, and every supplied role remains pinned by name. An invalid hexadecimal value produces a visible, recoverable validation error; correcting the field regenerates the preview and export.

## Select an explicit schema and framing

Use the schema that matches the palette framing:

```ts
import {
  VSCODE_FULL_ROLE_SCHEMAS,
  vscodePlugin
} from '@studnicky/iridis-vscode';

const schema = VSCODE_FULL_ROLE_SCHEMAS.dark;
```

`VSCODE_FULL_ROLE_SCHEMAS.dark` and `.light` are independent, explicit schemas. A light theme uses the light schema and `runtime.framing: 'light'`.

## Provide a tiered palette

`vscode:seedRoles` receives a structured object in `input.colors`:

```ts
const palette = {
  tier: selectedTier,
  framing: selectedFraming,
  roles: selectedRoles
};
```

The body contains `tier`, `framing`, and `roles`. `input.runtime.framing` must equal the body’s `framing`. Each supported tier has an exact role-key set defined by its exported schema.

Every supplied role is preserved by name. The pipeline derives absent roles from schema definitions. `core:roleProvenance` records each role's stated, derived, or synthesized origin and any resolution or contrast adjustment; `core:contrastReport` records the declared contrast results.

## Run the pipeline

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { writeFileSync } from 'node:fs';
import {
  VSCODE_FULL_ROLE_SCHEMAS,
  vscodePlugin
} from '@studnicky/iridis-vscode';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(vscodePlugin);
engine.pipeline([
  'vscode:seedRoles',
  'resolve:roles',
  'derive:roleRelations',
  'enforce:contrast',
  'report:compliance',
  'withhold:compliance',
  'emit:vscodeSemanticRules',
  'emit:vscodeThemeJson'
]);

const state = engine.run({
  'bypass': undefined,
  'colors': [{
    'tier': selectedTier,
    'framing': 'dark',
    'roles': selectedRoles
  }],
  'contrast': undefined,
  'emit': undefined,
  'maxColors': undefined,
  'metadata': { 'themeName': 'Iridis Dark' },
  'roles': VSCODE_FULL_ROLE_SCHEMAS.dark,
  'runtime': { 'colorSpace': undefined, 'extra': undefined, 'framing': 'dark' }
});

writeFileSync(
  'themes/iridis-dark-color-theme.json',
  JSON.stringify(state.outputs['vscode:themeJson'], null, 2)
);
```

## Pipeline stages

| Task | Result |
|---|---|
| `vscode:seedRoles` | Validates the structured palette and creates role-hinted seed records. |
| `resolve:roles` | Assigns and pins supplied role seeds. |
| `derive:roleRelations` | Resolves schema-authored role relationships. |
| `enforce:contrast` | Enforces every declared minimum and maximum WCAG contrast bound. |
| `report:compliance` | Writes terminal compliance evidence. |
| `withhold:compliance` | Signals strict terminal withholding while preserving resolved roles. |
| `emit:vscodeSemanticRules` | Projects semantic-token rules from resolved roles. |
| `emit:vscodeThemeJson` | Assembles `{ name, type, colors, semanticTokenColors, tokenColors }`. |

The final task requires semantic-token projection.

## Contrast and output contract

The canonical schema declares text and syntax pairs against `background`, `onAccent` against `accent`, links against `background`, and chrome foreground against chrome. `surface` and `accent` also use bounded contrast pairs, so they remain subordinate rather than becoming indistinguishable or over-emphasised.

All emitted colour values use canonical sRGB `#RRGGBB` or alpha-bearing `#RRGGBBAA`. The emitter does not output `color(display-p3 ...)`, and it omits the inert `warningForeground` VS Code colour ID.

## Load the generated file

Reference the result from a standard VS Code extension contribution:

```json
{
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
