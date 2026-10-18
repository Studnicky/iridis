<p align="center"><a href="https://studnicky.github.io/iridis/"><img src="https://raw.githubusercontent.com/Studnicky/iridis/main/readme-header.svg" alt="iridis" width="720" /></a></p>

# iridis

> Build accessible, role-based colour systems from seed colours.

[Documentation](https://studnicky.github.io/iridis/) · [Releases](https://github.com/Studnicky/iridis/releases) · [License](LICENSE)

iridis resolves seed colours into named OKLCH roles, derives missing family members, enforces declared contrast bands, and emits target-specific artifacts. It runs in browsers and Node.js and keeps derivation, contrast, and output formatting in separate tasks.

## Quick start

```bash
npm install @studnicky/iridis @studnicky/iridis-stylesheet
```

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(stylesheetPlugin);
engine.pipeline([
  'intake:hex',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'emit:cssVars'
]);

const state = engine.run(input);
const css = state.outputs['stylesheet:cssVars'];
```

`input` declares the seed colours, a role schema, and optional contrast requirements. The [Engine API](https://studnicky.github.io/iridis/#04-engine-api) documents the input shape and pipeline state.

## Choose an output

| Need | Package | Guide |
|---|---|---|
| CSS custom properties | [`@studnicky/iridis-stylesheet`](packages/stylesheet) | [Plugin ecosystem](https://studnicky.github.io/iridis/#06-plugin-ecosystem) |
| Tailwind, shadcn/ui, MUI, Chakra, Panda, or UnoCSS | [`@studnicky/iridis-tailwind`](packages/tailwind), [`shadcn`](packages/shadcn), [`mui`](packages/mui), [`chakra`](packages/chakra), [`panda`](packages/panda) | [Plugin ecosystem](https://studnicky.github.io/iridis/#06-plugin-ecosystem) |
| VS Code `theme.json` | [`@studnicky/iridis-vscode`](packages/vscode) | [VS Code theme recipe](https://studnicky.github.io/iridis/#08-vscode-theme-recipe) |
| Native Capacitor theme values | [`@studnicky/iridis-capacitor`](packages/capacitor) | [Vue + Capacitor recipe](https://studnicky.github.io/iridis/#05-recipe-vue-capacitor) |
| RDF palette graph | [`@studnicky/iridis-rdf`](packages/rdf) | [Plugin ecosystem](https://studnicky.github.io/iridis/#06-plugin-ecosystem) |
| A configuration-driven command | [`@studnicky/iridis-cli`](packages/cli) | [CLI usage](https://studnicky.github.io/iridis/#07-cli-usage) |

## Packages

- [`@studnicky/iridis`](packages/core) — engine, OKLCH colour records, role schemas, core tasks, and math primitives.
- [`@studnicky/iridis-contrast`](packages/contrast) — WCAG, APCA, and colour-vision-deficiency contrast tasks.
- [`@studnicky/iridis-image`](packages/image) — image palette extraction and harmonisation tasks.
- [`@studnicky/iridis-algebra`](packages/algebra), [`anima`](packages/anima), [`fsm`](packages/fsm), [`pulse`](packages/pulse), and [`trajectory`](packages/trajectory) — palette algebra, animation, transitions, and time/value bindings.
- [`@studnicky/iridis-stylesheet`](packages/stylesheet), [`tailwind`](packages/tailwind), [`shadcn`](packages/shadcn), [`mui`](packages/mui), [`chakra`](packages/chakra), [`panda`](packages/panda), [`capacitor`](packages/capacitor), [`rdf`](packages/rdf), and [`vscode`](packages/vscode) — output plugins.

## VS Code themes

The VS Code plugin accepts one structured seed palette with an exact 4, 8, 16, or 64-role key set and explicit `dark` or `light` framing. It resolves the complete 64-role vocabulary, enforces declared minimum and maximum contrast, and emits portable sRGB `#RRGGBB` or `#RRGGBBAA` values. See the [package README](packages/vscode/README.md) or the [theme recipe](https://studnicky.github.io/iridis/#08-vscode-theme-recipe).

## Development

Node.js 24 or newer and pnpm are required.

```bash
git clone https://github.com/Studnicky/iridis.git
cd iridis
pnpm install
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run packages:verify
```

`pnpm run build` emits 1,436 artifacts from 359 TypeScript sources.

The documentation source lives in [`site/`](site). `pnpm run site:debug` starts the local Nuxt documentation app.

## Installation from GitHub Packages

Packages publish under the `@studnicky` scope. Configure npm with a token that has `read:packages` access:

```ini
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Keep `NODE_AUTH_TOKEN` in the environment or a secret manager, never in committed configuration.

## License

MIT — see [LICENSE](LICENSE).
