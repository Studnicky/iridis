---
title: 6. Plugin Ecosystem
description: Extend iridis with framework-specific output formats.
---

A plugin is any object that satisfies `PluginInterface` by providing a collection of tasks.

```ts
interface PluginInterface {
  readonly name:    string;
  readonly version: string;
  tasks(): readonly TaskInterface[];
}
```

When you call `engine.adopt(plugin)`, iridis registers all of the plugin's tasks into the engine's `TaskRegistry` in one call.

## Official Plugins

iridis ships with an ecosystem of plugins designed to format the resolved palette into consumer-ready code. Each is published as a separate `@studnicky/iridis-*` package:

- `@studnicky/iridis-stylesheet`: Emits generic CSS custom properties (`--c-primary: #...`).
- `@studnicky/iridis-tailwind`: Emits a Tailwind CSS `tailwind.config.js` or `theme()` compatible object.
- `@studnicky/iridis-shadcn`: Emits CSS variables specifically structured for `shadcn/ui` integration.
- `@studnicky/iridis-mui`: Emits a Material UI `createTheme()` compatible palette object.
- `@studnicky/iridis-chakra`: Emits Chakra UI color tokens for `extendTheme()`.
- `@studnicky/iridis-panda`: Emits Panda CSS token configuration.
- `@studnicky/iridis-vscode`: Derives a full VS Code theme JSON (`tokenColors`, `semanticTokenColors`, and workbench UI elements).
- `@studnicky/iridis-capacitor`: Emits native status bar colors, splash screen config, and Android `theme.xml` for Capacitor mobile apps.
- `@studnicky/iridis-rdf`: Emits the palette as an RDF/OWL semantic graph.

## One resolved palette, every output

Every emit plugin above reads the same resolved state — the palette is resolved to roles exactly once per `engine.run()`, and each emit task translates that resolved `state.roles` into a consumer-shaped format rather than re-deriving colors itself. The engine derives once and lets emit tasks translate.

This is the same pattern a consuming app uses on itself, one layer up:

- **Engine pass** — the pipeline resolves seed colors to named roles and writes every registered emit task's slot into `state.outputs`.
- **Token write** — a small mapper (an `applyConfigToDocument`-style function) copies resolved roles onto `documentElement.style` under names the consumer chose, not names the engine chose.
- **Framework cascade** — your stylesheet, Tailwind config, or component library (shadcn/ui, MUI, Chakra, Panda) references those variables with `var()` and repaints.

None of the three layers imports the others; they agree only on variable names.

### Aliases make one schema serve every output

A role schema declares names like `brand` or `accent`; a consumer's tokens are named whatever that consumer already calls them. Rather than hard-coding one role name into an emit plugin, each plugin resolves a `candidates` chain — first declared role name that exists in `state.roles` wins — so a single role schema can drive `iridis-tailwind`, `iridis-shadcn`, `iridis-mui`, `iridis-chakra`, and the Panda CSS / UnoCSS pair without any plugin knowing about the others' token naming.

### The VS Code and RDF plugins are exceptions

Most plugins share one `engine.run()` because they read the same role schema. `iridis-vscode` is the exception: its token expansion needs roles named `background`, `muted`, `keyword`, and similar names that a typical site schema doesn't declare, so it needs its own dedicated engine pass against a VS Code-specific role schema (and, since that schema only documents dark-mode clamps, it always themes dark regardless of any light/dark toggle upstream). `iridis-rdf` needs no such special treatment — it rides the main pipeline, reading the same resolved roles as every other plugin and reasoning over them as RDF triples instead of templating them.

### Fallbacks still matter

A consumer that re-runs the engine on every palette change keeps every output current, but the token-write layer should still declare `:root` fallback values for the variables it writes — SSR, the pre-hydration paint, and any error path all need a value before the engine's first run completes. Reasonable defaults that match the site's dark/light framing cost one CSS block and mean the page never goes blank waiting on JavaScript.
