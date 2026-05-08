# @studnicky/iridis-cli

CLI runner. Reads a JSON config with `enable*` flags, dynamically imports the requested plugins, runs the engine, writes outputs to disk.

## Install

```bash
npm install @studnicky/iridis-cli
```

## Usage

```bash
iridis ./palette.config.json
```

Config shape:

```json
{
  "colors": ["#8B5CF6"],
  "roles": { "accent": 500 },
  "enableStylesheet": true,
  "enableTailwind": true,
  "enableVscode": false,
  "outDir": "./out"
}
```

The CLI dynamically imports only the plugins whose `enable*` flag is true, runs the same Engine as the library, and writes each plugin's outputs to separate files in `outDir`. Use it in build scripts, CI, or one-off generation jobs.

Part of [iridis](https://github.com/Studnicky/iridis).
