<p align="center"><a href="https://studnicky.github.io/iridis/"><img src="https://raw.githubusercontent.com/Studnicky/iridis/main/docs/public/readme-header.svg" alt="iridis: chromatic pipeline for dynamic palette derivation — OKLCH-native, contrast-enforced, schema-validated, plugin-extensible" width="720" /></a></p>

# iridis

> Chromatic pipeline for dynamic palette derivation. OKLCH-native, contrast-enforced, schema-validated, plugin-extensible.

[![docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/iridis/)
[![node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](package.json)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![release](https://img.shields.io/github/v/release/Studnicky/iridis?display_name=tag&color=14b8a6)](https://github.com/Studnicky/iridis/releases)

**[Documentation](https://studnicky.github.io/iridis/)** · **[Releases](https://github.com/Studnicky/iridis/releases)**

Variable-input-count seed colors expand into role-resolved, contrast-enforced palettes via a sequenced task pipeline. The docs site runs the live engine against its own brand palette; every chrome and syntax token on the page is the output of `engine.run()`.

- [Getting started](https://studnicky.github.io/iridis/getting-started) — install, the smallest possible pipeline, the shape of the output.
- [Try it out](https://studnicky.github.io/iridis/try-it-out) — edit seed colors and a role schema in the browser; the page recomputes through the engine on every keystroke.
- [Pipeline](https://studnicky.github.io/iridis/concepts/pipeline), [Role schemas](https://studnicky.github.io/iridis/concepts/role-schemas), [ColorRecord](https://studnicky.github.io/iridis/concepts/color-record) — engine concepts.
- [Contrast](https://studnicky.github.io/iridis/concepts/contrast) and [Accessibility calculations](https://studnicky.github.io/iridis/concepts/accessibility-calculations) — WCAG 2.1 AA/AAA, APCA Lc targets, CVD simulation and correction.
- [Recipes](https://studnicky.github.io/iridis/recipes/cli) — end-to-end snippets for the CLI, cascading CSS variables, and the Vue + Capacitor sample app.
- [Reference](https://studnicky.github.io/iridis/reference/hex) — per-color-space pages (Hex, RGB, HSV, CMYK, OKLCH) and accessibility-standards pages (WCAG 2.1, APCA).

## Packages

### Core

- [`@studnicky/iridis`](packages/core) — Pluggable color derivation pipeline. Variable-input-count seed colors expand into role-resolved, contrast-enforced palettes via a sequenced task pipeline. Browser- and Node-safe.
- [`@studnicky/iridis-cli`](packages/cli) — Command-line interface for running the pipeline against a config file and writing outputs to disk.

### Accessibility

- [`@studnicky/iridis-contrast`](packages/contrast) — WCAG 2.1 AA/AAA, APCA, and color-vision-deficiency enforcement — checks, corrects, and (for CVD) simulates against a resolved palette.

### Input

- [`@studnicky/iridis-image`](packages/image) — Extracts a palette from image pixels — histogram, dominant-color clustering, and harmonization tasks.

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
- [`@studnicky/iridis-rdf`](packages/rdf) — Emits the resolved palette as an RDF/OWL graph with SHACL-shaped reasoning annotations.

## Requirements

Node.js >= 24 (matches `engines.node` in `package.json`).

## Install

```bash
npm install @studnicky/iridis
```

Output targets ship as separate plugin packages; install only what you need:

```bash
npm install @studnicky/iridis-stylesheet @studnicky/iridis-tailwind @studnicky/iridis-vscode
```

## Develop

```sh
git clone https://github.com/Studnicky/iridis.git
cd iridis
npm install
npm run typecheck
npm test
npm run docs:dev
```

iridis ships source, not a build step — `typecheck` is the closest equivalent to `build` in this workspace.

The docs/demo site lives in [`site/`](site) — a Nuxt app that runs the real engine live against its own theme. See [`site/README.md`](site/README.md).

## License

MIT — see [LICENSE](./LICENSE).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) and the [GitHub releases](https://github.com/Studnicky/iridis/releases).
