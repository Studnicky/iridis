# Using the CLI

The iridis CLI runs the same engine and plugins as the library API. It reads a JSON config file, dynamically imports the plugins whose `enable*` flags are set, executes the pipeline, and writes the declared output files. Use it in build scripts or CI pipelines where you want palette generation without writing Node.js code.

## Equivalent CLI config

The CLI is a thin wrapper over `engine.run()`. The right-panel example on every doc page runs the same pipeline; the difference is that the panel selects one of the four built-in `iridis-N` schemas at runtime, while the CLI takes a `RoleSchemaInterface` object inline. Sketch of the input shape:

```jsonc
{
  "input": {
    "colors":   ["#7c3aed", "#06b6d4", "#10b981", "#ec4899"],
    "contrast": { "level": "AA", "algorithm": "wcag21" },
    "roles":    { /* RoleSchemaInterface inline; see Music sample below */ }
  },
  "pipeline": [
    "intake:hex",
    "clamp:count",
    "resolve:roles",
    "expand:family",
    "enforce:contrast",
    "derive:variant",
    "emit:json"
  ],
  "output": { "directory": "./out", "files": { "json": "palette.json" } }
}
```

---

## Install

```bash
npm install --save-dev @studnicky/iridis-cli
```

The CLI package declares the core engine as a peer dependency. Install the plugins you need alongside it:

::: code-group

```bash [minimal]
npm install --save-dev @studnicky/iridis-cli
```

```bash [with plugins]
npm install --save-dev \
  @studnicky/iridis-cli \
  @studnicky/iridis-contrast \
  @studnicky/iridis-stylesheet \
  @studnicky/iridis-capacitor
```

:::

Once installed, the `iridis` binary is available as an npm script command:

```bash
npx iridis ./palette.config.json
```

## Config file shape

The config is a plain JSON file validated against the `CliConfigSchema` (`packages/cli/src/CliConfigSchema.ts`). Three top-level fields are required: `input`, `pipeline`, and `output`.

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
    "expand:family",
    "resolve:roles",
    "enforce:wcagAA",
    "derive:variant",
    "emit:cssVars"
  ],
  "output": {
    "directory": "./out",
    "files": {
      "cssVars": "palette.css"
    }
  }
}
```

The `enable*` flags control which plugin packages are dynamically imported. Only flags set to `true` trigger an import. The corresponding package must be installed, the CLI does not install dependencies on your behalf.

The `pipeline` array maps directly to `engine.pipeline()` in the library API. Task names must be registered by either the core task set or one of the adopted plugins.

## The Music-category sample

`examples/vue-capacitor/category-w3c.config.json` shows the full Music category config:

```json
{
  "input": {
    "colors": ["#8B5CF6"],
    "contrast": { "level": "AA", "algorithm": "wcag21" },
    "metadata": {
      "category":     "music",
      "cssVarPrefix": "--c-",
      "scopeAttr":    "data-category",
      "scopePrefix":  "category",
      "themeName":    "music"
    },
    "roles": { /* categoryW3cRoleSchema inline */ }
  },
  "enableContrast":   true,
  "enableStylesheet": true,
  "enableCapacitor":  true,
  "pipeline": [
    "intake:any",
    "expand:family",
    "resolve:roles",
    "enforce:wcagAA",
    "derive:variant",
    "emit:cssVars",
    "emit:capacitorStatusBar",
    "emit:capacitorTheme"
  ],
  "output": {
    "directory": "./out",
    "files": {
      "cssVars":   "music.css",
      "capacitor": "music.capacitor.json"
    }
  }
}
```

Running `npx iridis ./category-w3c.config.json` writes two files to `./out/`: `music.css` (CSS custom properties) and `music.capacitor.json` (StatusBar/SplashScreen parameters).

## Wiring into a build pipeline

### npm script

```json
{
  "scripts": {
    "palette": "iridis ./palette.config.json",
    "build": "npm run palette && vite build"
  }
}
```

### GitHub Actions step

```yaml
- name: Generate palette
  run: npx iridis ./palette.config.json

- name: Upload palette artifact
  uses: actions/upload-artifact@v4
  with:
    name: palette
    path: out/
```

The CLI exits with code 0 on success and non-zero on validation or pipeline errors. Standard output carries progress logs; standard error carries fatal messages. Both are machine-readable in CI.
