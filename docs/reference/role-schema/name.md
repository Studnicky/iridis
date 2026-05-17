---
title: Role name
description: The unique identifier for a role within a schema. Drives the CSS variable the engine emits and the contrast pair references.
---

# Role name

The string identifier for a role within a `RoleSchemaInterface.roles[]`. Every other engine surface — emitted CSS variables, contrast-pair foreground / background references, intent overrides — reaches a role by this exact string.

## Shape

| Field | Type | Range |
|---|---|---|
| `name` | `string` | non-empty, unique within `roles[]` |

## What it does

- Becomes the suffix of the emitted CSS custom property: `--iridis-{name}: #rrggbb`.
- Is the value `contrastPairs[].foreground` and `contrastPairs[].background` reference.
- Is the key downstream consumers (`derive:variant`, `expand:family`, plugin emitters) use to look up the resolved record from `state.roles[name]`.

## What it means

A role name is **semantic**, not visual. `accent`, `surface`, `text`, `link` are role names because they say what the color is *for*. `#7c3aed` or `violet` are colors, not roles. Two schemas can both declare a role named `accent` and the engine will treat them as the same logical slot — the values they map to may differ, but the contract is identical.

## How to author

- Use lowercase kebab-case (`text-subtle`, `syntax-keyword`). Hyphens map cleanly into CSS variables.
- Keep names **short and stable**. Renaming a role is a breaking change for every CSS consumer that read `--iridis-{old-name}`.
- Avoid encoding intent into the name (`primary-button-color`) when an `intent` field is available — names should describe the slot, intents describe the family.

## Related

- [Role schemas overview](../../concepts/role-schemas) — full authoring guide.
- [Role intent](./intent) — orthogonal ontology hook attached to each role.
