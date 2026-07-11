---
title: 7. CLI Usage
description: Run iridis directly from your terminal using a JSON configuration file.
---

You don't have to write Node.js scripts to use iridis. The `@studnicky/iridis-cli` package allows you to run the engine directly from your terminal using a JSON configuration file.

```bash
npm install -g @studnicky/iridis-cli

iridis ./palette.config.json
```

The CLI dynamically imports and runs the plugins defined in your configuration file. This makes it perfect for integrating into CI/CD pipelines, build scripts, or code generation workflows.

## Install

```bash
npm install --save-dev @studnicky/iridis-cli
```

The CLI package declares the core engine as a peer dependency; install the plugins you need alongside it. Once installed, the `iridis` binary is available as an npm script command:

```bash
npx iridis ./palette.config.json
```

## Config file shape

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

A full worked config that enables the Contrast and Capacitor plugins together:

<<< @/examples/vue-capacitor/category-w3c.config.json

## Wiring into a build pipeline

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

The CLI exits with code `0` on success and non-zero on validation or pipeline errors. Standard output carries progress logs; standard error carries fatal messages, both are machine-readable in CI.
