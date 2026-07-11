---
title: 3. Plugins & CLI
description: Extend iridis with framework-specific output formats or run it directly from your terminal.
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

## The CLI Runner

You don't have to write Node.js scripts to use iridis. The `@studnicky/iridis-cli` package allows you to run the engine directly from your terminal using a JSON configuration file.

```bash
npm install -g @studnicky/iridis-cli

iridis ./palette.config.json
```

The CLI dynamically imports and runs the plugins defined in your configuration file. This makes it perfect for integrating into CI/CD pipelines, build scripts, or code generation workflows.

### Install

```bash
npm install --save-dev @studnicky/iridis-cli
```

The CLI package declares the core engine as a peer dependency; install the plugins you need alongside it. Once installed, the `iridis` binary is available as an npm script command:

```bash
npx iridis ./palette.config.json
```

### Config file shape

The config is a plain JSON file validated against `CliConfigSchema` (`packages/cli/src/CliConfigSchema.ts`). Three top-level fields are required: `input`, `pipeline`, and `output`.

```json
{
  "input": {
    "colors":   ["#8B5CF6"],
    "contrast": { "level": "AA", "algorithm": "wcag21" },
    "roles":    { /* RoleSchemaInterface inline */ },
    "metadata": { "cssVarPrefix": "--c-" }
  },
  "enableContrast":   true,
  "enableStylesheet": true,
  "enableCapacitor":  false,
  "enableVscode":     false,
  "enableTailwind":   false,
  "enableImage":      false,
  "enableRdf":        false,
  "pipeline": [
    "intake:any",
    "resolve:roles",
    "expand:family",
    "enforce:wcagAA",
    "derive:variant",
    "emit:cssVars"
  ],
  "output": {
    "directory": "./out",
    "files": {
      "stylesheet:cssVars": "palette.css"
    }
  }
}
```

The `enable*` flags control which plugin packages are dynamically imported. Only flags set to `true` trigger an import, and the corresponding package must already be installed, the CLI does not install dependencies on your behalf. The `pipeline` array maps directly to `engine.pipeline()` in the library API; task names must be registered by either the core task set or one of the adopted plugins.

### Wiring into a build pipeline

```json
{
  "scripts": {
    "palette": "iridis ./palette.config.json",
    "build": "npm run palette && vite build"
  }
}
```

```yaml
- name: Generate palette
  run: npx iridis ./palette.config.json

- name: Upload palette artifact
  uses: actions/upload-artifact@v4
  with:
    name: palette
    path: out/
```

The CLI exits with code `0` on success and non-zero on validation or pipeline errors. Standard output carries progress logs; standard error carries fatal messages, both are machine-readable in CI. See `examples/vue-capacitor/category-w3c.config.json` for a full worked config that enables the Contrast and Capacitor plugins together.
