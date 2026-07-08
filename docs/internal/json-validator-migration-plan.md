# Validator.ts → @studnicky/json SchemaValidator migration plan

Status: proposed, not started. This is an audit deliverable — no source or test
files have been touched.

## 0. Risk verdict up front

This migration is **higher risk than a typical "swap the internals" job**,
for two independent reasons, both documented in detail below:

1. **Error-message format gap is total.** `SchemaValidator` does not attempt
   to reproduce the legacy dot-path/bracket message format at all — it emits
   raw Ajv `instancePath` (slash-separated) and raw Ajv default messages. Every
   keyword-formatted message and every path assertion in
   `packages/core/tests/unit/Validator.test.ts` (34 assertions) depends on the
   exact strings `normalisePath`/`MESSAGE_FORMATTERS` produce today.
   **Recommendation: keep the legacy formatting layer as an adapter on top of
   SchemaValidator's raw Ajv errors — do not touch the 34 test assertions.**
   Rewriting the tests instead would touch a well-covered, stable test file
   for no functional gain and would silently degrade the CLI/Engine error UX
   (raw Ajv messages are worse for end users than the current formatted ones).

2. **Per-Validator Ajv-instance isolation is structurally incompatible with
   SchemaValidator's design.** `SchemaValidator.compile()` delegates to a
   **module-level singleton** `ajvInstance` (`AjvInstance.ts`) shared by every
   caller in the process. The current `Validator` design explicitly gives
   **each `new Validator()` its own private `Ajv` instance** so that
   plugin-contributed schemas registered by one `Engine`/`Validator` never
   leak into another's — this is called out in doc comments in both
   `Validator.ts` and `Engine.ts`. Delegating directly to `SchemaValidator`
   collapses ~45 independent `Ajv` registries (one per `new Engine()` across
   the test suite, see §5) into one shared registry for the whole process.
   Empirically this is *probably* safe today because the 6 core schemas are
   singleton `const` objects (Ajv's internal `_cache` is keyed by object
   identity, so repeat `compile()` calls on the same reference are a cache
   hit, not a re-registration) and no plugin currently contributes a schema
   carrying `$id`. But it is a silent behavioral change with no compiler
   backstop: a future plugin that reuses a `$id` (even accidentally, e.g. two
   plugins each defining their own `'https://…/Config'` schema) will throw
   `Error: schema with key or id "..." already exists` on the **second**
   `Engine` that adopts it, in a way it does not today. **This needs an
   explicit decision from the team, not just an implementation detail** — see
   §2.3 for the two mitigation options.

Neither issue blocks the migration; both are addressable with the adapter
design in §2. But they should be flagged before work starts, not discovered
mid-implementation.

## 1. Side-by-side: SchemaValidator vs. hand-rolled Validator.ts

| Concern | `Validator.ts` (current, 226 lines) | `@studnicky/json` `SchemaValidator` (4.0.0) |
|---|---|---|
| Ajv instance construction | `AjvFactory.make()` — **one new `Ajv` per `Validator` instance**, `{ allErrors: true, removeAdditional: false, strict: false }`, base `ajv` package (draft-07 dialect) | **One process-wide singleton** `ajvInstance` in `AjvInstance.ts`, `{ allErrors: true, allowUnionTypes: true, removeAdditional: false, strict: true }`, `ajv/dist/2020.js` (2020-12 dialect) + `ajv-formats` registered |
| Cross-schema `$ref` registration | `AjvFactory.make()` eagerly `addSchema()`s all 6 core schemas (`ColorRecordSchema`, `InputSchema`, `PaletteStateSchema`, `PluginSchema`, `RoleSchemaSchema`, `TaskManifestSchema`) so `$ref` by `$id` resolves | No eager registration API exposed. `$ref` resolution only works if the referenced schema was itself `compile()`-d (and thus added to the singleton's schema registry) before the referencing schema is compiled. Compile order becomes load-bearing. |
| Compile caching | `ValidatorClass` owns a private `WeakMap<object, ValidateFunction>` keyed by schema object, populated lazily on first `validate()` call | None at the `SchemaValidator` layer — doc comment says "Compile once at module load and reuse; compilation is the expensive step," i.e. caller-owned. Ajv's own internal `_cache` (keyed by schema object identity) provides a de-facto cache for repeat `compile()` calls on the same object, but `SchemaValidator` itself does not expose or guarantee this. |
| `instancePath` → legacy dot/bracket path | `normalisePath()` — `/a/b/0` → `a.b[0]`, special-cased `required` errors to append the missing property name (`a.b.missing`) | Not provided. `SchemaValidator.formatError` uses the raw Ajv `instancePath` (`/a/b/0`) or `(root)` if empty, and does not special-case `required`. |
| Per-keyword message text | `MESSAGE_FORMATTERS` table — 8 keywords (`type`, `required`, `additionalProperties`, `minItems`, `maxItems`, `minimum`, `maximum`, `pattern`, `enum`) each rendered in a bespoke, human-authored sentence (e.g. `expected string, got number`, `array length 1 is less than minItems 2`) | Not provided per-keyword. `SchemaValidator.formatError` is `${path}: ${error.message ?? 'invalid'}` — i.e. verbatim Ajv default `message` (e.g. `must be string`, `must NOT have fewer than 2 items`). `formatErrors()` joins multiple errors with `'; '` into one string, discarding per-error structure. |
| Actual-value resolution for messages | `Value.resolve()` walks the validated payload by `instancePath` so messages like `"${value} is less than minimum ${limit}"` and `expected ${type}, got ${actual}` can quote the offending value | Not needed/provided — Ajv's own `message` string does not require this, but also doesn't produce Validator.ts's phrasing. |
| Return shape | `{ valid: boolean, errors: { message: string, path: string }[] }` — one structured object per error | `ValidateFunction` (Ajv's own predicate, `fn(data): boolean` with `.errors: ErrorObject[] | null | undefined` as a side channel) plus a static `formatErrors()` that flattens all errors into one joined string. No structured per-error `{message, path}` array. |
| Compile-only validity check | `tryCompile(schema): boolean` — try/catch around `ajv.compile()`, discards the result | Not provided as a named method; equivalent is `try { SchemaValidator.compile(schema); return true; } catch { return false; }`, same as today, just relocated to the adapter. |
| Public surface consumed by callers | `new Validator()`, `.validate(schema, value)`, `.tryCompile(schema)` | `SchemaValidator.compile<T>(schema)`, `SchemaValidator.formatErrors(errors)` (both **static**, no instance, no per-instance isolation) |

**Net:** `SchemaValidator` replaces the "compile + cache + run" plumbing
(`AjvFactory`, the raw `ajv.compile`/`WeakMap` cache) but supplies **none** of
the legacy path-normalisation, per-keyword message formatting, or per-instance
isolation. All three must be re-implemented in the adapter layer that
replaces `Validator.ts`'s internals.

## 2. Adapter design

### 2.1 Public surface — unchanged

`Engine.ts:51` and `packages/cli/src/ConfigLoader.ts:9` both do
`new Validator()` and then call `.validate(schema, value)` and (`Engine.ts`
only) `.tryCompile(schema)`. Confirmed call sites (grep for
`.validate(` / `.tryCompile(` on a `Validator` instance):

- `packages/cli/src/ConfigLoader.ts:21` — `this.validator.validate(CliConfigSchema, data)`
- `packages/core/src/engine/Engine.ts:77` — `this.validator.validate(PluginSchema, plugin)`
- `packages/core/src/engine/Engine.ts:94` — `this.validator.validate(TaskManifestSchema, task.manifest)`
- `packages/core/src/engine/Engine.ts:117,128` — `this.validator.tryCompile(schema)` (plugin-contributed output/metadata schemas)
- `packages/core/src/engine/Engine.ts:210` — `this.validator.validate(InputSchema, input)`
- `packages/core/src/engine/Engine.ts:219` — `this.validator.validate(RoleSchemaSchema, input.roles)`
- `packages/core/src/engine/Engine.ts:263,275,289` — `this.validator.validate(PaletteStateSchema | schema, state | slotValue)`
- `packages/core/tests/unit/Validator.test.ts:26` — `const validator = new Validator()`, then `.validate()` in every cell (1–7)

**Do not change**: the exported binding name (`export const Validator = ...`
re-exported as a class-shaped const, per the existing doc comment), the
constructor signature (`new Validator()`, no args), `validate(schema, value):
ValidationResultInterfaceType` (`{ valid, errors: { message, path }[] }`), or
`tryCompile(schema): boolean`. `ValidationErrorInterfaceType` /
`ValidationResultInterfaceType` / `SchemaInterfaceType` in
`packages/core/src/types/index.ts` are unchanged.

### 2.2 Internals — delegate compile+run to SchemaValidator, keep formatting local

Replace `AjvFactory` + raw `this.#ajv.compile(schema)` calls with
`SchemaValidator.compile(schema)`. Concretely:

```ts
import { SchemaValidator } from '@studnicky/json';
import type { ErrorObject, ValidateFunction } from 'ajv';
```

- `ValidatorClass` keeps its own `WeakMap<object, ValidateFunction>` cache
  (unchanged) — `SchemaValidator.compile()` does not cache for the caller, so
  the existing per-instance cache is still required and still does the same
  job it does today: avoid recompiling an already-seen schema object.
- `validate(schema, value)`:
  1. Cache lookup as today; on miss, `fn = SchemaValidator.compile(schema)` instead of `this.#ajv.compile(schema)`.
  2. Run `fn(value)` — unchanged, `ValidateFunction` shape is the same Ajv type in both paths.
  3. On failure, keep calling the **existing** `normalisePath()` / `normaliseMessage()` / `Value.resolve()` functions in `Validator.ts` verbatim over `fn.errors` — these do not depend on which `Ajv` instance produced the `ErrorObject[]`, only on its shape (`instancePath`, `keyword`, `params`, `message`), which `SchemaValidator.compile()`'s `ValidateFunction` still carries (it is the same Ajv `ErrorObject`). **Do not call `SchemaValidator.formatErrors()`** — it produces the flattened, un-normalised format this migration must not surface (see §1, §3).
- `tryCompile(schema)`: try/catch around `SchemaValidator.compile(schema)`, same as today's try/catch around `this.#ajv.compile(schema)`.
- Delete `AjvFactory` entirely (no longer constructs or configures an `Ajv`).
- Delete the `readonly #ajv: Ajv` field and its constructor assignment; `ValidatorClass` no longer imports `Ajv` as a value import (only `ErrorObject`/`ValidateFunction` as types, matching what `SchemaValidator.d.ts` itself imports).

Net line delta: removes `AjvFactory` (~16 lines) and the `Ajv`-constructing
import; keeps `normalisePath`, `MESSAGE_FORMATTERS`, `normaliseMessage`,
`Value`, and `ValidatorClass`'s cache + `validate`/`tryCompile` bodies
essentially unchanged (adjust only the two `this.#ajv.compile(...)` call
sites to `SchemaValidator.compile(...)`).

### 2.3 Cross-schema `$ref` resolution — the load-bearing part

`PaletteStateSchema.ts` uses `$ref: 'https://studnicky.dev/iridis/ColorRecord'`
in two places (`colors[].items`, `roles.additionalProperties`,
`variants.additionalProperties.additionalProperties`). The legacy
`AjvFactory.make()` guarantees this resolves by eagerly `addSchema()`-ing all
6 core schemas into every fresh `Ajv` instance, order-independent (Ajv
resolves `$ref` lazily at compile time against whatever's already
registered, and `addSchema` doesn't compile eagerly).

`SchemaValidator.compile()` has no `addSchema` equivalent — it only adds a
schema to the singleton's registry when that schema is itself `compile()`-d
(compiling a schema register it under its own `$id` as a side effect of
`ajv.compile()`/`_addSchema()`). Two options:

- **(a) Compile-order dependency (recommended, matches current call pattern):**
  `ColorRecordSchema` must be `compile()`-d — thus registered into the
  singleton `ajvInstance` — before `PaletteStateSchema` is compiled. In
  practice this already holds: every code path validates `PaletteStateSchema`
  only from `Engine.ts:263` (`Engine.run`'s state-boundary check), and
  `ColorRecordSchema` is not currently validated standalone anywhere in
  `Engine.ts` — it is only ever reached indirectly via `$ref` from
  `PaletteStateSchema`. That means **today, nothing calls
  `validator.validate(ColorRecordSchema, …)` directly**, so `ColorRecordSchema`
  is never registered before `PaletteStateSchema` needs it, unless the
  adapter forces it. **Action required:** in the new `Validator.ts`, eagerly
  `SchemaValidator.compile(ColorRecordSchema)` (discard the result, purely
  for its registration side effect) once, before any caller can reach
  `PaletteStateSchema`. The cleanest place is a module-level side effect in
  `Validator.ts` (mirrors what `AjvFactory.make()` did, minus the other 4
  schemas which don't participate in any `$ref`). Confirm via `grep -rn '\$ref'
  packages/core/src/model/*.ts` (already done for this plan — only
  `PaletteStateSchema.ts` contains `$ref`, and only to `ColorRecordSchema`) that
  no other schema needs the same treatment.
- **(b) Inline the `$ref`s** — replace `PaletteStateSchema`'s three `$ref`
  pointers with the literal `ColorRecordSchema` object (spread or direct
  reference, JSON Schema allows a schema object to be reused by reference in
  multiple places in the same document tree). This removes the `$id`
  cross-reference and thus the ordering dependency entirely, at the cost of
  changing `PaletteStateSchema.ts` (a file this task's brief does not
  otherwise need to touch) and duplicating the schema in `PluginSchema`
  compile output. **Not recommended** for this migration — it's a larger,
  unrelated-looking diff to a schema file for a validator-internals change,
  and (a) is a two-line fix confined to `Validator.ts`.

Either way: **write a regression test** (or extend
`packages/core/tests/unit/Validator.test.ts` cell 2/6-adjacent coverage)
that directly validates a `PaletteStateSchema`-shaped payload with a
`colors[]` entry, asserting the nested `ColorRecordSchema` constraints
(e.g. `hex` pattern) are actually enforced through the `$ref` — this is
exactly the kind of thing that silently degrades to "any value passes" if
`$ref` resolution breaks (an unresolved `$ref` is a compile-time throw under
`strict: true`, so this would likely fail loudly rather than silently, but
confirm empirically rather than assuming).

### 2.4 Process-wide singleton isolation (§0 point 2) — decision needed

Two mitigation options, in order of preference:

- **(a) Accept the shared-registry semantics, document it.** The 6 core
  schemas are static, singleton, non-colliding by construction (`$id`s are
  all under `https://studnicky.dev/iridis/*`, one per file, no reuse). No
  currently-shipped plugin (`capacitor`, `contrast`, `rdf`, `vscode`,
  `image`, `stylesheet`, `tailwind` — all six confirmed via `grep -rn
  "'\$id'" packages/*/src`) defines a schema with `$id` at all — plugin
  `schemas()` contributions are anonymous object literals. Verify this
  explicitly for every plugin's `schemas()` implementation before merging
  (grep confirms only `packages/core/src/model/*.ts` currently declares
  `$id`); if that continues to hold, the singleton collapse is inert in
  practice. Update the doc comments in `Validator.ts` and `Engine.ts` that
  currently assert per-instance ajv isolation — they will no longer be
  accurate and should say instead that isolation is preserved for the
  compile-cache (`WeakMap`) but the underlying Ajv schema *registry* (by
  `$id`) is process-wide via `SchemaValidator`.
- **(b) Don't use `SchemaValidator.compile()` for schemas carrying `$id` at
  all; only use it for the anonymous/no-`$ref` compile path** (i.e. plugin
  `tryCompile()` calls, which today never carry `$id`), and keep a local,
  per-`Validator`-instance `Ajv` for the 6 core `$id`-bearing schemas. This
  preserves 100% of today's isolation guarantee but only migrates *half* the
  hand-rolled code (keeps `AjvFactory`, defeats much of the point of the
  migration). **Not recommended** unless (a)'s verification turns up an
  actual `$id` collision risk in a real plugin.

Recommend **(a)**, contingent on the grep-verification above holding at
implementation time (re-run it then, plugins may have changed).

## 3. Legacy-format-dependent test assertions (highest-risk inventory)

**Only one file** in the repository asserts on the exact legacy
dot-path/bracket format or the exact `MESSAGE_FORMATTERS` sentence text:
`packages/core/tests/unit/Validator.test.ts`. Confirmed by grepping every
test directory for `errorMsgs|errorPaths|.path ===|result.errors|
validator.validate|.tryCompile(` and cross-checking against the legacy
message substrings (`is not allowed`, `is missing`, `does not match
pattern`, `expected one of`, `less than min`, `greater than max`) — no hits
outside `Validator.test.ts`. `Engine.test.ts` and
`CapacitorPlugin.e2e.test.ts` assert only on the **outer wrapper strings**
(`/plugin invalid/`, `/input invalid/`, `/manifest invalid/`, via
`assert.match`), which are constructed in `Engine.ts`/`ConfigLoader.ts`
themselves (not in `Validator.ts`) and are unaffected by this migration.

Full inventory, `packages/core/tests/unit/Validator.test.ts`:

| Line(s) | Scenario | Exact expected string / pattern |
|---|---|---|
| 104 | type mismatch, object expected got string | `/expected object, got string/` |
| 114 | null rejected as object | `/expected object, got null/` |
| 211 | missing required property, path | `output!.errorPaths.includes('name')` |
| 213 | missing required property, message | `.includes('required property "name" is missing')` |
| 233 | nested type mismatch, dot-path | `output!.errorPaths.includes('color.hex')` |
| 235 | nested type mismatch, message | `.includes('expected string, got number')` |
| 255 | additionalProperties rejection, message | `.includes('additional property "extra" is not allowed')` |
| 280 | deep nested required-missing, path contains name | `output!.errorPaths.some((p) => p.includes('b'))` |
| 337 | array item type mismatch, indexed path | `output!.errorPaths.includes('[1]')` |
| 339 | array item type mismatch, message | `.includes('expected string, got number')` |
| 352 | minItems violation, message | `.includes('less than minItems 2')` |
| 365 | maxItems violation, message | `.includes('greater than maxItems 2')` |
| 442 | minimum violation, message | `.includes('less than minimum 0')` |
| 455 | maximum violation, message | `.includes('greater than maximum 1')` |
| 510 | pattern violation, message | `.includes('does not match pattern')` |
| 523 | enum violation, message | `.includes('expected one of [red, green, blue]')` |
| 589 | InputSchema missing `colors`, path | `output!.errorPaths.some((p) => p === 'colors')` |
| 593 | InputSchema missing `colors`, message | `.includes('required')` (loose — survives either format) |
| 606 | InputSchema `colors` non-array, message | `.includes('expected array, got string')` |

18 assertions across cells 1–6 depend on the **exact** legacy phrasing or
path shape (dot/bracket notation, `expected X, got Y`, `is missing`, `is not
allowed`, `less/greater than min/maxItems`, `does not match pattern`,
`expected one of […]`). Cell 7 (lines 641–733) and the construction fixture
(741) assert only on outer-wrapper regexes or `instanceof`, unaffected.

**Given §2.2's adapter design (keep `normalisePath`/`MESSAGE_FORMATTERS`
operating on `fn.errors` regardless of whether `fn` came from the legacy
`Ajv` instance or `SchemaValidator.compile()`), none of these 18 assertions
need to change.** The gap between `SchemaValidator`'s own raw format (`/a/b:
must be string`) and the legacy format is real but is fully absorbed by
keeping the formatting functions in `Validator.ts` and never calling
`SchemaValidator.formatErrors()`. This is why §0 recommends adapter-absorb
over test-rewrite: the gap is large (every keyword's wording differs, and
the path separator differs), which is exactly the condition under which
rewriting 18+ assertions is expensive and reformatting-in-the-adapter is
cheap and mechanical.

## 4. Schema shape compatibility

All 6 schemas (`ColorRecordSchema`, `InputSchema`, `PaletteStateSchema`,
`PluginSchema`, `RoleSchemaSchema`, `TaskManifestSchema`, in
`packages/core/src/model/*.ts`) are plain JSON Schema object literals
(`as const satisfies`-free — they are typed via `SchemaInterfaceType`, not
`FromSchema`) using only keywords valid in both draft-07 and 2020-12
(`type`, `properties`, `required`, `additionalProperties`, `enum`,
`pattern`, `minimum`/`maximum`, `minItems`/`maxItems`, `items` in
single-schema form, `description`, `$id`, and — `PaletteStateSchema` only —
`$ref`). No draft-07-only keywords (`definitions`, `dependencies`) and no
2020-12-only keywords (`prefixItems`, `$dynamicRef`, `unevaluatedProperties`)
appear anywhere in the 6 files (confirmed by reading all 6 in full).

Two behavioral deltas from moving `ajv (draft-07 default)` /
`strict: false` → `ajv/dist/2020.js` / `strict: true`:

1. **`strict: true` compiles more strictly.** None of the 6 schemas appear to
   trip strict-mode diagnostics on inspection (no unknown keywords, no
   `type`-less `properties`, no ambiguous `items` tuple usage), but this is
   an empirical claim, not a proof — **verify by actually compiling all 6
   schemas plus every plugin-contributed schema through
   `SchemaValidator.compile()` in a spike/smoke test before relying on it.**
   If any schema throws at compile time under `strict: true`, that surfaces
   immediately and loudly (an exception from `SchemaValidator.compile()`,
   caught by `tryCompile()` or propagating from `validate()`), not silently —
   low risk of it shipping unnoticed, but worth a dedicated pre-migration
   check since it gates the whole migration.
2. **`ajv-formats` is now registered** (`AjvInstance.ts` calls
   `addFormatsFunction(ajvInstance)`); the legacy `AjvFactory.make()` never
   registered `ajv-formats`. None of the 6 core schemas use the `format`
   keyword (confirmed by reading all 6), so this is inert today, but flag it:
   any future schema that adds `format: 'uri'`/`'date-time'`/etc. will now be
   **actively validated** post-migration where it would have been silently
   ignored (under `strict: false`, an unknown-to-ajv-core `format` value is a
   no-op) or thrown (under `strict: true` without `ajv-formats`, unknown
   formats are a strict-mode error) pre-migration. This is a strict
   improvement, not a regression, but worth noting in the PR description so
   it isn't mistaken for a bug if a schema's `format` keyword starts actually
   constraining data.

No shape adjustment is needed to any of the 6 schema object literals
themselves. The one required *code* change (not schema-file change) is
§2.3's compile-ordering fix for `PaletteStateSchema`'s `$ref`.

### 4.1 Dependency declaration gap

`@studnicky/json@^4.0.0` is declared in the **workspace root**
`package.json:63` but **not** in `packages/core/package.json`'s
`dependencies` (checked — only `@studnicky/logger` is listed there
alongside `typescript`/etc. devDependencies). `Validator.ts` lives in
`packages/core/src/model/`, so `packages/core/package.json` must gain
`"@studnicky/json": "^4.0.0"` as a direct dependency before `import {
SchemaValidator } from '@studnicky/json'` in `Validator.ts` is anything
other than an implicit hoisting accident. Add it explicitly; do not rely on
workspace hoisting.

## 5. Verification checklist

Run in this order; each gate should be green before proceeding to the next.

1. **Dependency wiring**
   - Add `"@studnicky/json": "^4.0.0"` to `packages/core/package.json` `dependencies`.
   - `npm install` at the workspace root (confirms lockfile resolves cleanly, no version conflicts).
2. **Pre-flight schema compile spike** (before touching `Validator.ts`'s
   internals for real, as a throwaway check — can be a scratch script, not a
   committed test): `SchemaValidator.compile()` each of the 6 core schemas
   plus every plugin's `schemas()` output (capacitor, contrast, rdf, vscode,
   image, stylesheet, tailwind), confirming none throw under `strict: true` +
   2020-12. Confirms §4 point 1 empirically.
3. **Typecheck, twice** (per repo convention — once pre-change baseline, once post-change):
   - `npm run typecheck` (or `litany typecheck`) before any edit, to capture the clean baseline.
   - Implement §2's adapter changes to `packages/core/src/model/Validator.ts` and `packages/core/package.json`.
   - `npm run typecheck` (or `litany typecheck`) again — must be clean, and specifically confirm `Engine.ts` and `ConfigLoader.ts` typecheck unchanged (their call sites are untouched, so this should be a no-op diff for them).
4. **Lint** — `litany lint` (or `npx eslint .` per repo config) over `packages/core/src/model/Validator.ts`; confirm no new `@ts-ignore`/`eslint-disable` were introduced (forbidden per project standards — the adapter should not need any).
5. **`packages/core` test suite, specifically**
   - `packages/core/tests/unit/Validator.test.ts` — all cells 1–7 plus the construction fixture; this is the file from §3 and must pass with **zero assertion changes**.
   - `packages/core/tests/unit/Engine.test.ts` — covers `Engine.adopt`/`Engine.run` validation boundaries (outer-wrapper message assertions, §3).
   - Full `packages/core` unit + e2e + integration suites (`Pipeline.composition.e2e.test.ts`, `TaskRegistry.e2e.test.ts`, `RequiredRoles.e2e.test.ts`, `CategoryE2e.test.ts`, `Engine.e2e.test.ts`, `Pipeline.integration.test.ts`, `ResolveRoles.test.ts`, `ColorRecordShape.test.ts`, `ClampOklch.test.ts`, `EngineSyncHueScale.test.ts`) — every one of these constructs at least one `new Engine()` (and thus a `new Validator()`), so collectively they're the regression surface for §2.4's singleton-registry concern across ~25 independent `Engine` instantiations in one test run.
   - `npx litany test unit` and `npx litany test e2e`/`integration` scoped to `packages/core` (per `<✓ Test>` conventions: CI runs unit only, integration/e2e run locally before push — run both here since this change touches shared validation plumbing).
6. **Downstream package suites that construct `Engine`/`Validator`** — confirm no regression in packages that only consume the public API (`packages/cli` — `ConfigLoader` + `Cli.ts`; `packages/capacitor`, `packages/contrast`, `packages/image`, `packages/rdf`, `packages/stylesheet`, `packages/tailwind`, `packages/vscode` e2e suites, all of which do `new Engine()`). These exercise §2.4's shared-singleton concern under real plugin `schemas()` contributions, not just core's own schemas.
7. **Full CI gate before merge** — `litany ci` (or `/enginseer:quality-ci`): changelog, deps, validate, build, lint, docs, tests — per project standard, not just the scoped checks above.

## 6. Summary of file touches (for the implementing agent)

- `packages/core/src/model/Validator.ts` — replace `AjvFactory` + raw
  `Ajv`-instance construction with `SchemaValidator.compile()` calls (§2.2);
  add the one-time `ColorRecordSchema` pre-registration (§2.3 option a);
  keep `normalisePath`, `MESSAGE_FORMATTERS`, `normaliseMessage`, `Value`,
  and the `WeakMap` cache unchanged; keep the public `validate`/`tryCompile`
  signatures unchanged; update the class doc comment to reflect §2.4's
  revised isolation guarantee (compile-cache is per-instance, Ajv schema
  *registry* is process-wide via the singleton).
- `packages/core/package.json` — add `@studnicky/json` to `dependencies` (§4.1).
- No changes to `Engine.ts`, `ConfigLoader.ts`, or any `packages/core/src/model/*Schema.ts` file.
- No changes to any test file, contingent on §2's adapter design being implemented as specified — if the implementing agent instead calls `SchemaValidator.formatErrors()` directly (skipping the legacy formatting layer), all 18 assertions in §3 will need rewriting and downstream error-message UX in the CLI/Engine will regress; that path is explicitly **not** recommended.
