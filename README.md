<p align="center"><a href="https://studnicky.github.io/iridis/"><img src="https://raw.githubusercontent.com/Studnicky/iridis/main/readme-header.svg" alt="iridis: chromatic pipeline for dynamic palette derivation — OKLCH-native, contrast-enforced, schema-validated, plugin-extensible" width="720" /></a></p>

# iridis

> Chromatic pipeline for dynamic palette derivation. OKLCH-native, contrast-enforced, schema-validated, plugin-extensible.

[![docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/iridis/)
[![node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](package.json)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![release](https://img.shields.io/github/v/release/Studnicky/iridis?display_name=tag&color=14b8a6)](https://github.com/Studnicky/iridis/releases)

**[Documentation](https://studnicky.github.io/iridis/)** · **[Releases](https://github.com/Studnicky/iridis/releases)**

Variable-input-count seed colors expand into role-resolved, contrast-enforced palettes via a sequenced task pipeline. The docs site runs the live engine against its own brand palette; every chrome and syntax token on the page is the output of `engine.run()`.

- [What is Iridis](https://studnicky.github.io/iridis/#01-what-is-iridis) and [the four stages](https://studnicky.github.io/iridis/#02-the-four-stages) — installation, pipeline concepts, and state flow.
- [Adopting Iridis](https://studnicky.github.io/iridis/#03-adopting-existing-apps) and the [Engine API](https://studnicky.github.io/iridis/#04-engine-api) — integration strategy, role schemas, contrast, and engine composition.
- [Vue + Capacitor](https://studnicky.github.io/iridis/#05-recipe-vue-capacitor), [plugin ecosystem](https://studnicky.github.io/iridis/#06-plugin-ecosystem), [CLI](https://studnicky.github.io/iridis/#07-cli-usage), and [VS Code themes](https://studnicky.github.io/iridis/#08-vscode-theme-recipe) — end-to-end recipes and output targets.
- [Task registry](https://studnicky.github.io/iridis/#09-task-registry-reference), [math primitives](https://studnicky.github.io/iridis/#10-math-primitives-reference), and [architecture](https://studnicky.github.io/iridis/#11-architecture-internals) — complete technical references.
- [Living Color](https://studnicky.github.io/iridis/#12-living-color) — palette algebra, animation, state transitions, signal bindings, and named trajectories.

## Packages

### Core

- [`@studnicky/iridis`](packages/core) — Pluggable color derivation pipeline. Variable-input-count seed colors expand into role-resolved, contrast-enforced palettes via a sequenced task pipeline. Browser- and Node-safe.
- [`@studnicky/iridis-cli`](packages/cli) — Command-line interface for running the pipeline against a config file and writing outputs to disk.

### Accessibility

- [`@studnicky/iridis-contrast`](packages/contrast) — WCAG 2.1 AA/AAA, APCA, and color-vision-deficiency enforcement — checks, corrects, and (for CVD) simulates against a resolved palette.

### Input

- [`@studnicky/iridis-image`](packages/image) — Extracts a palette from image pixels — histogram, dominant-color clustering, and harmonization tasks.

### Living color

- [`@studnicky/iridis-algebra`](packages/algebra) — Palette vector math in OKLCH×N space through `lerp`, `subtract`, `nearest`, `drift`, and `perpendicular`.
- [`@studnicky/iridis-anima`](packages/anima) — Evaluates palette curves with easing, chromatic detours, and per-frame contrast enforcement through `evaluate`, `evaluateStops`, and `evaluateEnforced`.
- [`@studnicky/iridis-fsm`](packages/fsm) — Drives named palette transitions with `PaletteStateMachine` and enter, exit, and rejection hooks.
- [`@studnicky/iridis-pulse`](packages/pulse) — Binds real or virtual clocks and arbitrary scalar sources to palette curves through `ClockBinding` and `ValueBinding`.
- [`@studnicky/iridis-trajectory`](packages/trajectory) — Registers reusable multi-stop palette curves through `TrajectoryRegistry`, `sunriseTrajectory`, `duskFadeTrajectory`, and `focusPulseTrajectory`.

### Output targets

Each ships as a separate plugin package; install only what you need.

- [`@studnicky/iridis-stylesheet`](packages/stylesheet) — Emits plain and scoped CSS custom-property stylesheets from resolved roles.
- [`@studnicky/iridis-tailwind`](packages/tailwind) — Emits a Tailwind CSS theme config from resolved roles and shade scales.
- [`@studnicky/iridis-vscode`](packages/vscode) — Derives a full VS Code theme (tokenColors, semanticTokenColors, 101 workbench colors) from a resolved palette.
- [`@studnicky/iridis-shadcn`](packages/shadcn) — Emits shadcn/ui CSS variables from resolved roles.
- [`@studnicky/iridis-mui`](packages/mui) — Emits an MUI theme (createTheme() palette config) from resolved roles.
- [`@studnicky/iridis-chakra`](packages/chakra) — Emits a Chakra UI extendTheme() color-token scale from resolved roles and their dark/light variants.
- [`@studnicky/iridis-panda`](packages/panda) — Emits Panda CSS and UnoCSS theme configs from resolved roles.
- [`@studnicky/iridis-capacitor`](packages/capacitor) — Emits Capacitor status bar, splash screen, native theme config, and Android theme.xml from a resolved palette.
- [`@studnicky/iridis-rdf`](packages/rdf) — Emits the resolved palette as an RDF graph (roles, colors, derivation/pin/clamp relations, contrast pairs) under the `iridis` vocabulary, serializable to Turtle/TriG/N-Quads/JSON-LD.

## Requirements

Node.js >= 24 (matches `engines.node` in `package.json`).

## Install

Iridis packages are published through GitHub Packages under the `@studnicky` scope. Configure npm to use that registry before installing them. Local installs require `NODE_AUTH_TOKEN` to contain a personal access token (classic) with `read:packages` permission; the GitHub account that owns the token must have read access to the package and its linked repository. Keep the token in your shell or secret manager, never in `.npmrc` or source control.

Add the following environment-backed configuration to your project or user `.npmrc`:

```ini
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install the core package:

```bash
npm install @studnicky/iridis
```

Output targets ship as separate plugin packages; install only what you need:

```bash
npm install @studnicky/iridis-stylesheet @studnicky/iridis-tailwind @studnicky/iridis-vscode
```

## Develop

```bash
git clone https://github.com/Studnicky/iridis.git
cd iridis
pnpm install
pnpm run build
pnpm run typecheck
pnpm test
pnpm run packages:verify

# Preferred one-shot debug launch
pnpm run site:debug
```

All 18 public packages build compiled ESM and declarations into `dist/`. `pnpm run build` emits 1,292 artifacts from 323 TypeScript sources. `pnpm run packages:verify` validates 18 staged archives, all 42 public subpaths, strict NodeNext consumer typechecking, runtime imports, metadata, dependency closure, and the compiled CLI executable. Local verification does not publish packages; remote versioning and publication require separate explicit authorization.

The docs/demo site lives in [`site/`](site) — a Nuxt app that runs the real engine live against its own theme. See [`site/README.md`](site/README.md).

## License

MIT — see [LICENSE](./LICENSE).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) and the [GitHub releases](https://github.com/Studnicky/iridis/releases).
