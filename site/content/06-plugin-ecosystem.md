---
title: Plugin Ecosystem
description: Extend iridis with target-specific output tasks.
---

A plugin implements `PluginInterface` and contributes a named set of tasks. `engine.adopt(plugin)` registers both its tasks and its state-schema contributions.

```ts
interface PluginInterface {
  readonly name: string;
  readonly version: string;
  tasks(): readonly TaskInterface[];
}
```

## Official plugins

| Package | Output or capability |
|---|---|
| `@studnicky/iridis-stylesheet` | CSS custom-property blocks |
| `@studnicky/iridis-tailwind` | Tailwind theme configuration |
| `@studnicky/iridis-shadcn` | shadcn/ui CSS variables |
| `@studnicky/iridis-mui` | MUI `createTheme()` palette data |
| `@studnicky/iridis-chakra` | Chakra `extendTheme()` token scales |
| `@studnicky/iridis-panda` | Panda CSS and UnoCSS theme data |
| `@studnicky/iridis-vscode` | VS Code workbench, semantic-token, and TextMate theme data |
| `@studnicky/iridis-capacitor` | Capacitor status bar, splash screen, and Android XML values |
| `@studnicky/iridis-rdf` | RDF palette graph and serialisations |
| `@studnicky/iridis-contrast` | WCAG, APCA, and colour-vision-deficiency tasks |
| `@studnicky/iridis-image` | Image extraction and palette harmonisation tasks |

## One resolved palette, multiple outputs

Core tasks resolve named roles once for an engine run. Output plugins consume those resolved roles and write their own `state.outputs` slot; they do not recreate role assignment or contrast policy. A consumer then maps the emitted data into its framework or artifact format.

This separation keeps the roles schema independent from target naming. A stylesheet, Tailwind, MUI, Chakra, Panda, or Capacitor plugin can select from compatible resolved role names without changing the underlying palette derivation.

## VS Code is a dedicated palette contract

The VS Code plugin uses a dedicated engine pass because its output requires an editor-specific role vocabulary. Its input is a structured palette object with supported tier keys and an explicit `dark` or `light` framing. `VSCODE_FULL_ROLE_SCHEMAS.dark` and `.light` define the canonical schemas; `VSCODE_COMPACT_ROLE_SCHEMAS` is the compact view.

The pass pins supplied role names, derives the remaining vocabulary, enforces declared WCAG minimum and maximum contrast bounds, then emits sRGB VS Code theme data. See the [VS Code theme recipe](/08-vscode-theme-recipe).

## Consumer fallbacks

Generated output is authoritative after the pipeline runs. Browser consumers still benefit from CSS fallback values for server rendering, first paint, and error paths. Keep those fallback values in the consuming application; iridis does not write directly to the DOM.
