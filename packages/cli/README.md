# @studnicky/iridis-cli

CLI runner for `@studnicky/iridis`. Reads a JSON config, dynamically imports
the plugins whose `enable*` flag is `true`, runs the engine, and writes each
plugin's outputs to separate files in `output.directory`. Same `Engine` the
library API uses — the CLI is a thin shell around `engine.run()`.

## Install

```bash
npm install --save-dev @studnicky/iridis-cli
```

Core engine is a peer dependency:

```bash
npm install --save-dev \
  @studnicky/iridis-cli \
  @studnicky/iridis \
  @studnicky/iridis-stylesheet \
  @studnicky/iridis-contrast
```

## Usage

```bash
npx iridis ./palette.config.json
```

The config is validated against `CliConfigSchema`. Required top-level keys:
`input`, `pipeline`, `output`.

```json
{
  "input": {
    "colors":   ["#8B5CF6"],
    "contrast": { "level": "AA", "algorithm": "wcag21" },
    "roles":    { "name": "site", "roles": [
      { "name": "background", "intent": "background", "required": true, "lightnessRange": [0.95, 1.0] },
      { "name": "text",       "intent": "text",       "required": true, "lightnessRange": [0.10, 0.25] },
      { "name": "accent",     "intent": "accent",     "required": true }
    ], "contrastPairs": [
      { "foreground": "text", "background": "background", "minRatio": 4.5, "algorithm": "wcag21" }
    ] },
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
    "expand:family",
    "resolve:roles",
    "enforce:wcagAA",
    "derive:variant",
    "emit:cssVars"
  ],
  "output": {
    "directory": "./out",
    "files": { "cssVars": "palette.css" }
  }
}
```

The `enable*` flags determine which plugin packages the CLI `import()`s at
runtime — only flags set to `true` trigger a dynamic import, and the
corresponding package must be installed alongside the CLI.

`output.files` is a `Record<string, string>` keyed by the plugin's
`PluginOutputsRegistry` slot name (`cssVars`, `tailwind`, `vscode`, `capacitor`,
`reasoning`, `json`). Each value is written relative to `output.directory`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Config validated, pipeline ran, every output file written. |
| non-zero | Validation, resolution, or pipeline error. Standard error carries the message; standard output keeps the progress trail. |

Both streams are machine-readable in CI.

## Programmatic use

```ts
import {
  Cli,
  ConfigLoader,
  PluginResolver,
  OutputWriter,
} from '@studnicky/iridis-cli';

const cli = new Cli();
await cli.run(['./palette.config.json']);
```

The four exported classes (`Cli`, `ConfigLoader`, `PluginResolver`,
`OutputWriter`) let you assemble the CLI into a larger build tool without
shelling out to the binary.

Part of [iridis](https://github.com/Studnicky/iridis).
