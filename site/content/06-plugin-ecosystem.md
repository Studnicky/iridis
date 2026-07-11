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
