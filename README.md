<p align="center"><a href="https://studnicky.github.io/iridis/"><img src="https://raw.githubusercontent.com/Studnicky/iridis/main/docs/public/readme-header.svg" alt="iridis" width="720" /></a></p>

# iridis

> Chromatic pipeline for dynamic palette derivation. OKLCH-native, contrast-enforced, schema-validated, plugin-extensible.

## Documentation

The full documentation is published at **https://studnicky.github.io/iridis/**. The site runs the live engine against its own brand palette; every chrome and syntax token on the page is the output of `engine.run()`.

- [Getting started](https://studnicky.github.io/iridis/getting-started) — install, the smallest possible pipeline, the shape of the output.
- [Try it out](https://studnicky.github.io/iridis/try-it-out) — edit seed colors and a role schema in the browser; the page recomputes through the engine on every keystroke.
- [Pipeline](https://studnicky.github.io/iridis/concepts/pipeline), [Role schemas](https://studnicky.github.io/iridis/concepts/role-schemas), [ColorRecord](https://studnicky.github.io/iridis/concepts/color-record) — engine concepts.
- [Contrast](https://studnicky.github.io/iridis/concepts/contrast) and [Accessibility calculations](https://studnicky.github.io/iridis/concepts/accessibility-calculations) — WCAG 2.1 AA/AAA, APCA Lc targets, CVD simulation.
- [Recipes](https://studnicky.github.io/iridis/recipes/cli) — end-to-end snippets for the CLI, cascading CSS variables, and the Vue + Capacitor sample app.
- [Reference](https://studnicky.github.io/iridis/reference/hex) — per-color-space pages (Hex, RGB, HSV, CMYK, OKLCH) and accessibility-standards pages (WCAG 2.1, APCA).

## Requirements

Node.js >= 24 (matches `engines.node` in `package.json`).

## Install

```bash
npm install @studnicky/iridis
```

Output targets (CSS variables, Tailwind, VS Code themes, native chrome, RDF graphs) ship as separate plugin packages; install only what you need:

```bash
npm install @studnicky/iridis-stylesheet @studnicky/iridis-tailwind @studnicky/iridis-vscode
```

## License

MIT — see [LICENSE](./LICENSE).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) and the [GitHub releases](https://github.com/Studnicky/iridis/releases).
