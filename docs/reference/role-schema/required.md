---
title: Required roles
description: Roles flagged required must appear in the resolved palette. Optional roles get synthesised if the seed count is insufficient.
---

# Required roles

A role with `required: true` MUST be present in `state.roles` after the pipeline runs. If the user supplies fewer seeds than the schema declares roles, the engine synthesises missing **non-required** roles via `expand:family` derivation; **required** roles never get auto-synthesised — the engine assigns the closest matching seed.

## Shape

| Field | Type | Default |
|---|---|---|
| `required` | `boolean` | `false` |

## What it does

`resolve:roles` walks the role list and pairs seeds to roles. Required roles get first-pick of seeds; optional roles fill in afterward. If the seed count exceeds the role count, surplus seeds are dropped. If the seed count is less than the role count:
- Required roles still need to be assigned — the engine picks the seed whose OKLCH coordinates are closest to the role's envelopes.
- Optional roles without a seed are either left absent (consumer sees `state.roles[name] === undefined`) or synthesised by `expand:family` if `derivedFrom` is declared.

## What it means

Required is the **contract** flag. It says "every palette this schema produces MUST have this role" — a downstream consumer that reads `state.roles.background` can do so unconditionally if `background` is required. Optional roles encode "nice to have if there's room."

In practice:
- `background`, `text`, `brand` are almost always required. The docs site relies on all three resolving.
- `surface`, `bg-soft`, `divider` are optional and `derivedFrom: background` so they always show up regardless of seed count.
- `success`, `warning`, `error` are optional with `hueLock` so they show up only when the schema chose to include them.

## How to author

- Mark a role required when downstream consumers would crash without it. The four-tier docs schemas mark `background`, `text`, `brand`, `muted` required.
- Mark a role optional when it has a sensible parametric definition (`derivedFrom` + envelope) and the engine can always synthesise it.
- Don't mark a role required without also providing tight `lightnessRange` / `chromaRange` envelopes — the engine will assign a seed regardless and might land in a degenerate slot otherwise.

## Related

- [Derived roles](./derived-from) — how optional roles get synthesised when seeds run out.
- [Role schemas overview](../../concepts/role-schemas).
