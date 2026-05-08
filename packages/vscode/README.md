# @studnicky/iridis-vscode

Generates VS Code semantic-token rules and workbench-color customizations from a 16-color palette. Lifts the derivation table that powers Arcade Blaster.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-vscode
```

## Usage

```ts
import { engine } from '@studnicky/iridis';
import { vscodePlugin } from '@studnicky/iridis-vscode';

engine.adopt(vscodePlugin);
engine.pipeline(['intake:any', 'resolve:roles', 'emit:vscode']);

const state = await engine.run({
  colors: ['#8B5CF6', '#EC4899'],
  roles: your16ColorSchema,
});

const theme = state.outputs.vscode;
// theme.semanticTokenColors: { 'variable': '#...', ... }
// theme.colors: { 'editor.background': '#...', ... }
```

The plugin emits a 253-rule semantic token system derived from 16 base colors times 10 modifiers plus 23 workbench slots, with 100+ language scope mappings for TypeScript, Python, Go, Rust, and others.

Part of [iridis](https://github.com/Studnicky/iridis).
