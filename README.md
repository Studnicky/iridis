<p align="center"><a href="https://studnicky.github.io/iridis/"><img src="https://raw.githubusercontent.com/Studnicky/iridis/main/readme-header.svg" alt="iridis" width="720" /></a></p>

# iridis

Build accessible, role-based colour systems from seed colours.

[![CI](https://github.com/Studnicky/iridis/actions/workflows/ci.yml/badge.svg)](https://github.com/Studnicky/iridis/actions/workflows/ci.yml)
[![docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/iridis/)
[![node](https://img.shields.io/badge/node-%3E%3D24.12.0-brightgreen)](package.json)
[![release](https://img.shields.io/github/v/release/Studnicky/iridis?display_name=tag&color=14b8a6)](https://github.com/Studnicky/iridis/releases)

[Browse the documentation →](https://studnicky.github.io/iridis/)

> [!CAUTION]
> Node.js 24.12 or later is required. The engine and its plugins also run in browsers.

> [!TIP]
> Choose the smallest package that matches the problem you are solving.

> [!NOTE]
> This README helps you choose a package. Complete usage guidance, APIs, and examples are on GitHub Pages.

The workspace validates public package archives against their staged build contents before release.

## Install

Packages are published to GitHub Packages. Add the registry to your project's `.npmrc` with a token that has `read:packages` access:

```ini
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install the packages you need:

```sh
pnpm add @studnicky/iridis @studnicky/iridis-contrast @studnicky/iridis-stylesheet
```

## Choose an import path

The engine resolves seed colours into named OKLCH roles. Adopt the contrast plugin to apply an accessibility standard, then adopt one output plugin for each artifact you need. The pipeline lists the task names to run, in order.

```typescript
import type { RoleSchemaEntity } from "@studnicky/iridis";

import { Engine, coreTasks } from "@studnicky/iridis";
import { contrastPlugin } from "@studnicky/iridis-contrast";
import { stylesheetPlugin } from "@studnicky/iridis-stylesheet";

export function generateStylesheet(roleSchema: RoleSchemaEntity.Type) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(contrastPlugin);
  engine.adopt(stylesheetPlugin);

  engine.pipeline([
    "intake:any",
    "resolve:roles",
    "expand:family",
    "enforce:compliance",
    "derive:variant",
    "report:compliance",
    "emit:cssVars",
  ]);

  const state = engine.run({
    bypass: undefined,
    colors: ["#8B5CF6"],
    contrast: { algorithm: "wcag21", cvdMode: "nudge", extra: undefined, level: "AA", nonMandatoryLevel: "AA" },
    emit: undefined,
    maxColors: undefined,
    metadata: undefined,
    roles: roleSchema,
    runtime: undefined,
  });

  return {
    css: state.outputs["stylesheet:cssVars"],
    report: state.metadata["contrast:complianceReport"],
  };
}
```

`enforce:compliance` applies the selected standard (WCAG 2.1 AA, WCAG 2.1 AAA, or APCA, chosen through `input.contrast`) to every declared contrast pair. Roles you state are never changed; unstated roles are recalculated around them. A set of stated roles that cannot meet the standard yields the closest palette and a report whose `problemPairs` name each failing pair; `input.contrast.enableStrictCompliance` marks such a report `withheld`. `report:compliance` writes the typed `contrast:complianceReport`.

Two optional settings in `input.contrast` choose how strictly the engine applies the rest of the checks:

- `cvdMode` — `warn` (default) reports colour-vision-deficiency failures without changing the palette, `nudge` corrects unstated roles toward them, and `enforce` also blocks a palette whose stated roles cannot clear them.
- `nonMandatoryLevel` — `AA` (default) or `AAA`. For WCAG it selects the standard for declared non-mandatory pairs such as borders and focus rings. With the current APCA schema fallback it selects Lc60 or Lc75 for every Lc60 pair; body text at Lc75 remains mandatory. `level` governs text pairs.

[Read the Engine API →](https://studnicky.github.io/iridis/#04-engine-api)

## Find a package

### Core

<details>
<summary><strong>@studnicky/iridis</strong> — resolve seed colours into named roles</summary>

Use it for the engine, OKLCH colour records, role schemas, the core pipeline tasks, and the math primitives that every other package builds on.

[Read the engine guide →](https://studnicky.github.io/iridis/#04-engine-api)

</details>

### Contrast & accessibility

<details>
<summary><strong>@studnicky/iridis-contrast</strong> — apply an accessibility standard to every contrast pair</summary>

Use it when palette roles must meet WCAG 2.1 AA, WCAG 2.1 AAA, or APCA, hold under colour-vision-deficiency simulation, and produce a typed compliance report.

[Read the contrast guide →](https://studnicky.github.io/iridis/#09-task-registry-reference)

</details>

### Image

<details>
<summary><strong>@studnicky/iridis-image</strong> — extract a palette from image pixels</summary>

Use it to reduce image pixels to dominant colours, assign them to roles, and harmonise the accent against the frame.

[Read the image guide →](https://studnicky.github.io/iridis/#09-task-registry-reference)

</details>

### Animation & transitions

<details>
<summary><strong>@studnicky/iridis-algebra</strong> — treat palettes as vectors</summary>

Use it for pure palette math: interpolate between palettes, subtract one from another, find the nearest preset, and detect drift past a tolerance.

[Read the algebra guide →](https://studnicky.github.io/iridis/#12-living-color)

</details>

<details>
<summary><strong>@studnicky/iridis-anima</strong> — evaluate palette curves over time</summary>

Use it to evaluate a palette curve at a progress value with easing, and to re-check declared contrast pairs on every frame.

[Read the anima guide →](https://studnicky.github.io/iridis/#12-living-color)

</details>

<details>
<summary><strong>@studnicky/iridis-fsm</strong> — drive palette state transitions</summary>

Use it when an interface has named palette states and you step between them frame by frame.

[Read the fsm guide →](https://studnicky.github.io/iridis/#12-living-color)

</details>

<details>
<summary><strong>@studnicky/iridis-pulse</strong> — bind time or values to progress</summary>

Use it to map real time, deterministic virtual time, or a scalar such as scroll position onto the progress value that animation consumes.

[Read the pulse guide →](https://studnicky.github.io/iridis/#12-living-color)

</details>

<details>
<summary><strong>@studnicky/iridis-trajectory</strong> — name reusable palette curves</summary>

Use it for a registry of named multi-stop palette trajectories that you resolve at any progress value.

[Read the trajectory guide →](https://studnicky.github.io/iridis/#12-living-color)

</details>

### Output plugins

<details>
<summary><strong>@studnicky/iridis-stylesheet</strong> — emit CSS custom properties</summary>

Use it when your application consumes colour as CSS variables, including dark, wide-gamut, and forced-colors blocks.

[Read the stylesheet guide →](https://studnicky.github.io/iridis/#06-plugin-ecosystem)

</details>

<details>
<summary><strong>@studnicky/iridis-tailwind</strong> — emit a Tailwind theme</summary>

Use it to generate a Tailwind `colors` object, a CSS-first companion sheet, and a ready-to-import config.

[Read the tailwind guide →](https://studnicky.github.io/iridis/#06-plugin-ecosystem)

</details>

<details>
<summary><strong>@studnicky/iridis-shadcn</strong> — emit a shadcn/ui theme</summary>

Use it to generate the CSS custom properties shadcn/ui components read, as OKLCH triples.

[Read the shadcn guide →](https://studnicky.github.io/iridis/#06-plugin-ecosystem)

</details>

<details>
<summary><strong>@studnicky/iridis-mui</strong> — emit an MUI theme palette</summary>

Use it to generate a palette object for MUI's `createTheme()`.

[Read the mui guide →](https://studnicky.github.io/iridis/#06-plugin-ecosystem)

</details>

<details>
<summary><strong>@studnicky/iridis-chakra</strong> — emit Chakra UI color tokens</summary>

Use it to generate color-token scales for Chakra UI's `extendTheme()`.

[Read the chakra guide →](https://studnicky.github.io/iridis/#06-plugin-ecosystem)

</details>

<details>
<summary><strong>@studnicky/iridis-panda</strong> — emit Panda CSS and UnoCSS tokens</summary>

Use it to drive a Panda CSS token config and an UnoCSS theme from the same resolved roles.

[Read the panda guide →](https://studnicky.github.io/iridis/#06-plugin-ecosystem)

</details>

<details>
<summary><strong>@studnicky/iridis-capacitor</strong> — emit native Capacitor theme values</summary>

Use it to generate StatusBar configuration, a Material colour map, SplashScreen background, and an Android `colors.xml` fragment.

[Read the capacitor guide →](https://studnicky.github.io/iridis/#05-recipe-vue-capacitor)

</details>

<details>
<summary><strong>@studnicky/iridis-rdf</strong> — emit an RDF palette graph</summary>

Use it to annotate the resolved palette as RDF triples and serialise to Turtle, TriG, N-Quads, or JSON-LD.

[Read the rdf guide →](https://studnicky.github.io/iridis/#06-plugin-ecosystem)

</details>

<details>
<summary><strong>@studnicky/iridis-vscode</strong> — emit a VS Code theme</summary>

Use it to generate a portable `theme.json` from a framed, tiered seed palette. The plugin consumes the same engine and the same `input.contrast` configuration as every other output.

[Read the vscode guide →](https://studnicky.github.io/iridis/#08-vscode-theme-recipe)

</details>

### Tooling

<details>
<summary><strong>@studnicky/iridis-cli</strong> — run a configuration-driven pipeline</summary>

Use it to run the engine from a JSON config and write each plugin's output to a file, without writing code.

[Read the cli guide →](https://studnicky.github.io/iridis/#07-cli-usage)

</details>

## License

MIT — see [LICENSE](LICENSE).
