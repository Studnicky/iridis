---
title: Role intent
description: The ontology tag attached to each role. Drives forced-colors mapping, APCA targets, WCAG ratio selection, and emitter semantics.
---

# Role intent

A canonical tag from the `ColorIntentType` union that says what *kind* of role this is, independent of its name. Drives every downstream semantic decision: forced-colors token selection, APCA Lc target, WCAG required-ratio, Capacitor `StatusBar` style.

## Allowed values

The intent vocabulary is closed at 10 members, grouped by usage family.

### Core ontology

| Intent | Meaning |
|---|---|
| `text` | Primary text content painted over a background. |
| `background` | Primary surface that receives a foreground. |
| `accent` | Brand or emphasis colour calling attention. |
| `muted` | Low-emphasis text or chrome (de-emphasised content). |

### Signal family

| Intent | Meaning |
|---|---|
| `critical` | Error or danger state signal. |
| `positive` | Success or affirmative state signal. |

### Interaction family

| Intent | Meaning |
|---|---|
| `link` | Anchor text foreground. |
| `button` | Actionable surface (button face). |
| `onAccent` | Foreground painted onto an accent surface. |
| `onButton` | Foreground painted onto a button surface. |

## What it does

- `EmitCssVars.forcedColorsToken` picks the Windows-High-Contrast-Mode system color from the intent. `text` → `CanvasText`, `background` → `Canvas`, `critical` → `Mark`, etc.
- `EnforceApca` selects the Lc target from the intent (60 for normal text intent, 75 for large text, 90 for body text on chromatic accents).
- `wcagRequiredRatio` selects the default minimum contrast ratio (4.5:1 normal, 3:1 large, etc) when a contrast pair doesn't declare one explicitly.
- `EmitCapacitorTheme` reads `background` to set the iOS `StatusBar` style.

## What it means

Intent is orthogonal to role name. Two roles with intent `accent` are *both* accents — the schema's `derivedFrom` plus `hueOffset` is the right tool to relate them parametrically. Intent is the **classifier**; `name` is the **identifier**.

## How to author

- Always set an intent on every role. Roles without an intent inherit the *role-name-substring-inferred* fallback (legacy), which is unstable.
- Use the intent that matches the role's purpose, not its appearance. A muted-grey role used as quiet body text is `text`, not `muted`.
- When introducing a new role family that doesn't fit the closed ontology, fall back to the closest member rather than inventing a string. The ontology is intentionally small to keep downstream emitters reliable.

## Related

- [Role schemas overview](../../concepts/role-schemas) — full authoring guide.
- [Contrast pairs](./contrast-pairs) — declares which intents pair against which.
