# Role schemas

A role schema is a consumer-authored description of what a palette means in a particular context. It is the contract between your design system and iridis. You decide what roles exist, what constraints they carry, and which pairs must meet accessibility thresholds. iridis enforces the contract on every run.

## What a role schema is

`RoleSchemaInterface` has three fields: a `name`, an optional `description`, an array of `roles`, and an optional array of `contrastPairs`. It is a plain TypeScript object — not a class, not a schema registry entry. You pass it directly to `engine.run()` via `input.roles`.

```ts
import type { RoleSchemaInterface } from '@studnicky/iridis/model';

export const mySchema: RoleSchemaInterface = {
  name:  'my-palette',
  roles: [ /* ... */ ],
  contrastPairs: [ /* ... */ ],
};
```

The schema is intentionally minimal. iridis does not prescribe role names — `canvas`, `accent`, `text`, `background`, `keyword`, `error` are all equally valid. Name roles after what they mean in your product, not after generic design tokens.

## Required vs optional roles

Each `RoleDefinitionInterface` carries a `required` boolean. When `required: true`, `resolve:roles` emits a warning in `state.metadata.roleWarnings` if no color could be assigned. The pipeline continues regardless — required is advisory, not a hard error. Your integration code can inspect `state.metadata.roleWarnings` and surface failures as appropriate.

Optional roles (no `required` field, or `required: false`) are simply skipped if no candidate matches.

## derivedFrom — parametric expansion

The `derivedFrom` field links a role to another role in the same schema. `expand:family` runs after `resolve:roles` and synthesizes any unassigned role that has `derivedFrom` set. It takes the source role's OKLCH color and applies the lightness, chroma, and hue constraints declared on the derived role.

This is how a single seed color can produce a full family. Set `derivedFrom: 'accent'` on an `onAccent` role with `lightnessRange: [0.98, 1.0]`, and iridis produces a near-white overlay color that shares the accent's hue but clears any contrast threshold you impose.

`expand:family` never overwrites a role that was already assigned by `resolve:roles`. If you pass multiple seeds and one matches `onAccent` by hint, the derived path is skipped.

## lightnessRange, chromaRange, hueOffset

These optional range fields constrain where a role can land in OKLCH space. All values use the OKLCH scale: lightness 0–1, chroma 0–0.5, hue 0–360.

| Field | Type | Effect |
|---|---|---|
| `lightnessRange` | `[number, number]` | Role assignment scores colors by distance to range midpoint |
| `chromaRange` | `[number, number]` | Same — used for chroma scoring and derivation |
| `hueOffset` | `number` | Rotates hue relative to the source role during `expand:family` |

`resolve:roles` uses a weighted OKLCH distance to the range centers when multiple candidates compete for the same role. A color whose lightness sits at range center scores best. `clamp:oklch` (optional, runs before role resolution) can pre-clamp all colors to their role's declared ranges.

## contrastPairs — the accessibility contract

`contrastPairs` declares which foreground/background role combinations must meet a minimum contrast ratio. `enforce:contrast` (core) and the named variants `enforce:wcagAA` / `enforce:wcagAAA` / `enforce:apca` in the contrast plugin all operate on these pairs.

Each `ContrastPairInterface` specifies:

| Field | Type | Required |
|---|---|---|
| `foreground` | `string` | Role name |
| `background` | `string` | Role name |
| `minRatio` | `number` | Minimum ratio (e.g. `4.5` for WCAG AA normal text) |
| `algorithm` | `'wcag21' \| 'apca'` | Defaults to `input.contrast.algorithm` or `'wcag21'` |

When a pair fails, `enforce:contrast` nudges the foreground role's OKLCH lightness in 0.02 increments (up to 50 steps) until the ratio is met, then replaces `state.roles[foreground]` with the adjusted color. The constraint report is written to `state.metadata.contrastReport`.

## The categoryW3cRoleSchema example

`examples/vue-capacitor/categoryW3cRoleSchema.ts` defines a 7-role schema for per-category music app palettes. It targets WCAG 2.1 AA throughout.

```ts
export const categoryW3cRoleSchema: RoleSchemaInterface = {
  name:        'category-w3c',
  description: 'WCAG 2.1 AA role schema for category colour palettes',
  roles: [
    {
      name:           'canvas',       // [A] Page / card background
      intent:         'base',
      required:       true,
      lightnessRange: [0.92, 1.0],    // [B] Forces near-white
    },
    {
      name:           'surface',
      intent:         'surface',
      required:       true,
      lightnessRange: [0.86, 0.96],
    },
    {
      name:     'accent',             // [C] No range — closest color wins
      intent:   'accent',
      required: true,
    },
    {
      name:           'onAccent',
      intent:         'text',
      required:       true,
      derivedFrom:    'accent',       // [D] Synthesized from accent
      lightnessRange: [0.98, 1.0],   //     Near-white overlay
    },
    {
      name:           'border',
      intent:         'neutral',
      lightnessRange: [0.60, 0.80],
    },
    {
      name:           'muted',
      intent:         'muted',
      lightnessRange: [0.45, 0.65],
    },
    {
      name:           'text',
      intent:         'text',
      required:       true,
      lightnessRange: [0.10, 0.25],   // [E] Forces dark text
    },
  ],
  contrastPairs: [
    { foreground: 'text',     background: 'canvas',  minRatio: 4.5, algorithm: 'wcag21' }, // [F]
    { foreground: 'text',     background: 'surface', minRatio: 4.5, algorithm: 'wcag21' },
    { foreground: 'onAccent', background: 'accent',  minRatio: 4.5, algorithm: 'wcag21' },
    { foreground: 'border',   background: 'canvas',  minRatio: 3.0, algorithm: 'wcag21' }, // [G]
  ],
};
```

Annotations: **[A]** `canvas` is mandatory — no canvas means no contrast surface to anchor the rest. **[B]** The tight lightness range (0.92–1.0) biases role resolution strongly toward pale colors even when the seed is saturated. **[C]** `accent` carries no range constraint — `resolve:roles` assigns whichever input color is closest in the perceptual space. **[D]** `onAccent` will never appear in the input; `expand:family` synthesizes it from the resolved `accent` color. **[E]** `text` is forced below L=0.25, guaranteeing dark-mode-style contrast on light surfaces. **[F]** The 4.5:1 threshold is WCAG AA for normal text. **[G]** 3.0:1 is WCAG AA for large text and non-text UI elements.

## The vscodeRoleSchema16 example

`packages/vscode/src/data/vscodeRoleSchema16.ts` defines a 16-role schema for VS Code dark theme generation. The schema is dense: most roles are `required`, most have both `lightnessRange` and `chromaRange`, and many are derived.

```ts
export const vscodeRoleSchema16: RoleSchemaInterface = {
  name: 'vscode-16-dark',
  roles: [
    {
      name:           'background',
      intent:         'surface',
      required:       true,
      lightnessRange: [0.03, 0.20],   // Dark background
      chromaRange:    [0.00, 0.12],   // Low chroma (near-neutral)
    },
    {
      name:           'foreground',
      intent:         'text',
      required:       true,
      lightnessRange: [0.85, 0.98],   // Near-white text
      chromaRange:    [0.00, 0.08],
    },
    {
      name:        'surface',
      derivedFrom: 'background',      // Sidebar, slightly lighter
      lightnessRange: [0.05, 0.22],
      chromaRange:    [0.00, 0.14],
    },
    {
      name:        'keyword',
      intent:      'accent',
      required:    true,
      lightnessRange: [0.50, 0.85],
      chromaRange:    [0.16, 0.40],   // High chroma — vivid accent
    },
    {
      name:        'type',
      derivedFrom: 'keyword',         // Sibling role — same hue family
      lightnessRange: [0.55, 0.85],
      chromaRange:    [0.16, 0.40],
    },
    // ... 11 more roles
  ],
  contrastPairs: [
    { foreground: 'foreground', background: 'background', minRatio: 7.0, algorithm: 'wcag21' }, // AAA
    { foreground: 'keyword',    background: 'background', minRatio: 4.5, algorithm: 'wcag21' }, // AA
    // ... 8 more pairs
  ],
};
```

The `derivedFrom` chains in this schema (`surface ← background`, `type ← keyword`, `function ← keyword`, `string ← function`, `number ← string`, `constant ← number`) let iridis derive a coherent token family from two seed colors — one dark background and one vivid accent. The `contrastPairs` enforce WCAG AA/AAA throughout against the dark background.
