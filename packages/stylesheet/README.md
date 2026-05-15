# @studnicky/iridis-stylesheet

Emits CSS custom properties from resolved roles. Produces a four-block stylesheet:
unconditional `:root` defaults, a `@media (prefers-color-scheme: dark)` override,
a `@supports (color: color(display-p3 0 0 0))` wide-gamut override, and a
`@media (forced-colors: active)` block whose values are Windows High Contrast
Mode (WHCM) system tokens picked by `hints.intent`.

Cascade order in the emitted `full` string: `:root` → `@media dark` →
`@supports display-p3` → `@media forced-colors`. Later blocks win in the cascade;
forced-colors is intentionally last so accessibility tokens override any coloured
value emitted above them.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-stylesheet
```

## Usage

```ts
import { Engine, coreTasks }  from '@studnicky/iridis';
import { stylesheetPlugin }   from '@studnicky/iridis-stylesheet';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(stylesheetPlugin);

engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:cssVars',
]);

const state = await engine.run({
  'colors':   ['#8B5CF6'],
  'roles':    yourRoleSchema,
  'contrast': { 'level': 'AA' },
  'metadata': { 'cssVarPrefix': '--c-' },
});

const out = state.outputs['cssVars']!;
document.documentElement.style.cssText = out.full;
```

`state.outputs['cssVars']` is typed as `CssVarsOutputInterface` via the plugin's
module augmentation:

| Field | Shape | Notes |
|---|---|---|
| `rootBlock` | `string` | The unconditional `:root { ... }` block |
| `scopedBlock` | `string` | Same declarations wrapped in `[data-theme='...']` |
| `darkScheme` | `string` | `@media (prefers-color-scheme: dark) { :root { ... } }`, empty when `state.variants.dark` is unset |
| `wideGamut` | `string` | `@supports` block with `color(display-p3 r g b)` values, empty when no role has `displayP3` populated |
| `forcedColors` | `string` | `@media (forced-colors: active)` block with WHCM tokens picked from `hints.intent` |
| `full` | `string` | All four blocks concatenated in cascade order |
| `map` | `Record<string, string>` | Role name → CSS variable name |

The `emit:cssVarsScoped` task is the multi-scope companion: register it instead
of `emit:cssVars` when you need one block per `state.variants` entry under a
data-attribute selector (`[data-category='music']`, `[data-tenant='acme']`).
Output lives at `state.outputs['cssVarsScoped']`.

Part of [iridis](https://github.com/Studnicky/iridis).
