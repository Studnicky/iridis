---
title: 7. CLI Usage
description: Run an iridis pipeline from a validated JSON configuration file.
---

`@studnicky/iridis-cli` loads a JSON configuration, adopts the requested plugins, runs the named pipeline, and writes declared output slots inside the configured output directory.

## Install and run

```bash
npm install --save-dev @studnicky/iridis-cli @studnicky/iridis-stylesheet
npx iridis ./palette.config.json
```

The executable accepts one argument:

```text
iridis <config.json>
```

It exits non-zero for a missing config path, configuration validation failure, plugin-resolution failure, or pipeline error.

## Configuration

A config requires `input`, `pipeline`, and `output`. Optional `enable*` flags dynamically import the matching installed plugin; the CLI never installs packages.

```json
{
  "input": {
    "colors": ["#101820", "#f5f7fa", "#7c3aed", "#ef4444"],
    "roles": {
      "name": "example",
      "roles": [
        { "name": "background", "intent": "background", "required": true, "lightnessRange": [0.06, 0.18] },
        { "name": "foreground", "intent": "text", "required": true, "lightnessRange": [0.88, 0.98] },
        { "name": "accent", "intent": "accent", "required": true, "lightnessRange": [0.60, 0.80] }
      ],
      "contrastPairs": [
        { "foreground": "foreground", "background": "background", "minRatio": 7, "algorithm": "wcag21" },
        { "foreground": "accent", "background": "background", "minRatio": 4.5, "algorithm": "wcag21" }
      ]
    },
    "metadata": { "cssVarPrefix": "--c-" }
  },
  "enableStylesheet": true,
  "pipeline": [
    "intake:any",
    "resolve:roles",
    "expand:family",
    "enforce:contrast",
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

`output.files` maps a slot written by the configured pipeline to a relative file name. The CLI rejects an output key that no selected task writes and rejects a file path that escapes `output.directory`.

## Plugin flags

| Flag | Package adopted when `true` |
|---|---|
| `enableCapacitor` | `@studnicky/iridis-capacitor` |
| `enableContrast` | `@studnicky/iridis-contrast` |
| `enableImage` | `@studnicky/iridis-image` |
| `enableRdf` | `@studnicky/iridis-rdf` |
| `enableStylesheet` | `@studnicky/iridis-stylesheet` |
| `enableTailwind` | `@studnicky/iridis-tailwind` |
| `enableVscode` | `@studnicky/iridis-vscode` |

The `pipeline` array passes task names to `engine.pipeline()`. Each selected plugin must be installed beside the CLI package. The [task registry](/09-task-registry-reference) lists the shipped task names and their declared state slots.

## CI integration

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
