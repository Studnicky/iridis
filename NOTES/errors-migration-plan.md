# Errors migration plan: `packages/core/src/engine/Engine.ts` and `packages/core/src/registry/TaskRegistry.ts`

## 1. Why

`Engine` and `TaskRegistry` are the composition root of every iridis package: every
plugin's tasks flow through `Engine.adopt` / `Engine.pipeline` / `Engine.run`, which in
turn call every `TaskRegistry` method. Both files currently throw `new Error(templateString)`
at every failure point. Callers can only recover by regex/`.includes()`-matching the
message string — there is no error code, no structured context, and no way to
distinguish "bad input schema" from "missing task registration" programmatically.

`@studnicky/errors@4.0.0` replaces this with two catchable, structured error classes:

- `ValidationError` (code `errors.validationFailed`) — schema/shape validation failures
  at a public API boundary. Carries `path`, a `violations` list, and renders
  `Validation failed at "<path>": <summary>`.
- `ModuleError` (code driven by `ErrorDefaults[scenario]`, e.g. `NOT_FOUND` →
  `NOT_FOUND` code / `retryable: false` / `statusCode: 404`) — non-validation domain
  failures (missing resource, bad configuration, etc.), constructed via
  `ModuleError.create(message, { scenario, context, cause?, retryable?, statusCode? })`.

Both extend `BaseError extends Error`, so every existing `assert.ok(err instanceof Error)`
test keeps passing unchanged. All existing `.message.includes('...')` test assertions
are preserved by design (see §3) — the literal substrings each test checks for are kept
verbatim inside the new `message` argument passed to `ValidationError.create` /
`ModuleError.create`.

## 2. Package dependency change

`packages/core/package.json` does **not** currently list `@studnicky/errors` as a
dependency (only `@studnicky/logger`, `ajv`, `json-schema-to-ts`). Add it:

```jsonc
// packages/core/package.json — "dependencies"
"dependencies": {
  "@studnicky/errors": "^4.0.0",
  "@studnicky/logger": "^4.0.0",
  "ajv": "^8.20.0",
  "json-schema-to-ts": "^3.1.1"
}
```

(The workspace root `package.json` already depends on `@studnicky/errors@^4.0.0` and
`@studnicky/types@^4.0.0`, and `node_modules/@studnicky/errors` is already installed —
this is a manifest correction, not a new install.)

## 3. Throw-site-by-throw-site replacement

### `packages/core/src/engine/Engine.ts`

Add at the top of the file (after the existing `import type { ... } from '../types/index.ts';` block):

```ts
import { ModuleError, ValidationError } from '@studnicky/errors';
```

---

**Site 1 — line 80-82, `adopt()`, plugin fails `PluginSchema` validation.**

Current:
```ts
const pluginResult = this.validator.validate(PluginSchema, plugin);
if (!pluginResult.valid) {
  const first = pluginResult.errors[0];
  throw new Error(
    `Engine.adopt: plugin invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`
  );
}
```

Fit: `ValidationError` — this is exactly a schema-validation-at-a-public-boundary case
(`Validator.validate` against `PluginSchema`).

Replacement:
```ts
const pluginResult = this.validator.validate(PluginSchema, plugin);
if (!pluginResult.valid) {
  const first = pluginResult.errors[0];
  throw ValidationError.create({
    'path':    first !== undefined ? `plugin${first.path}` : 'plugin',
    'message': `Engine.adopt: plugin '${plugin.name}' invalid: ${first !== undefined ? first.message : 'unknown error'}`,
    'violations': pluginResult.errors.map((e) => ({ 'path': `plugin${e.path}`, 'message': e.message }))
  });
}
```

---

**Site 2 — line 97-99, `adopt()`, task manifest fails `TaskManifestSchema` validation.**

Current:
```ts
const manifestResult = this.validator.validate(TaskManifestSchema, task.manifest);
if (!manifestResult.valid) {
  const first = manifestResult.errors[0];
  throw new Error(
    `Engine.adopt: task '${task.name}' manifest invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`
  );
}
```

Fit: `ValidationError`.

Replacement:
```ts
const manifestResult = this.validator.validate(TaskManifestSchema, task.manifest);
if (!manifestResult.valid) {
  const first = manifestResult.errors[0];
  throw ValidationError.create({
    'path':    first !== undefined ? `task.manifest${first.path}` : 'task.manifest',
    'message': `Engine.adopt: task '${task.name}' manifest invalid: ${first !== undefined ? first.message : 'unknown error'}`,
    'violations': manifestResult.errors.map((e) => ({ 'path': `task.manifest${e.path}`, 'message': e.message }))
  });
}
```

Preserves the substring `manifest invalid` required by
`packages/core/tests/unit/Engine.test.ts:667` and
`packages/core/tests/unit/Engine.test.ts:275` (via
`(err as Error).message.includes('manifest invalid')`).

---

**Site 3 — line 117-120, `adopt()`, plugin-contributed output schema fails `tryCompile`.**

Current:
```ts
if (!this.validator.tryCompile(schema)) {
  throw new Error(
    `Engine.adopt: plugin '${plugin.name}' contributed malformed output schema for slot '${slot}'`
  );
}
```

Fit: `ValidationError` — the *schema itself* is malformed (ajv can't compile it), which
is still a shape-validation failure at the plugin-contribution boundary. There is no
`ValidationResultInterfaceType` to draw violations from here (`tryCompile` returns a
plain boolean), so `violations` is omitted.

Replacement:
```ts
if (!this.validator.tryCompile(schema)) {
  throw ValidationError.create({
    'path':    `plugin.schemas.outputs.${slot}`,
    'message': `Engine.adopt: plugin '${plugin.name}' contributed malformed output schema for slot '${slot}'`
  });
}
```

Preserves `malformed` / `schema` substrings required by
`packages/core/tests/unit/Engine.test.ts:694`.

---

**Site 4 — line 128-131, `adopt()`, plugin-contributed metadata schema fails `tryCompile`.**

Current:
```ts
if (!this.validator.tryCompile(schema)) {
  throw new Error(
    `Engine.adopt: plugin '${plugin.name}' contributed malformed metadata schema for slot '${slot}'`
  );
}
```

Fit: `ValidationError` (same reasoning as Site 3).

Replacement:
```ts
if (!this.validator.tryCompile(schema)) {
  throw ValidationError.create({
    'path':    `plugin.schemas.metadata.${slot}`,
    'message': `Engine.adopt: plugin '${plugin.name}' contributed malformed metadata schema for slot '${slot}'`
  });
}
```

---

**Site 5 — line 154-156, `pipeline()`, a named task in `order` is not registered.**

Current:
```ts
for (const name of order) {
  if (!this.tasks.has(name)) {
    throw new Error(`Engine.pipeline: task '${name}' is not registered`);
  }
}
```

Fit: `ModuleError` with `scenario: 'NOT_FOUND'`. This is not a shape/schema validation
failure — `name` is a plain string, there is no schema being checked — it is "the
caller referenced a resource (a registered task) that does not exist," which is exactly
`ErrorDefaults.NOT_FOUND` (`code: 'NOT_FOUND'`, `retryable: false`, `statusCode: 404`).

Replacement:
```ts
for (const name of order) {
  if (!this.tasks.has(name)) {
    throw ModuleError.create(`Engine.pipeline: task '${name}' is not registered`, {
      'scenario': 'NOT_FOUND',
      'context':  { 'taskName': name, 'operation': 'Engine.pipeline' }
    });
  }
}
```

Preserves the `nonexistent:task` substring required by
`packages/core/tests/e2e/Engine.e2e.test.ts:482`.

---

**Site 6 — line 178-181, `pipeline()`, a `requires` dependency is absent from the order entirely.**

Current:
```ts
if (depIndex === -1) {
  throw new Error(
    `Engine.pipeline: task '${name}' requires '${dep}', which is missing from the pipeline entirely`
  );
}
```

Fit: `ModuleError` with `scenario: 'CONFIGURATION'`. This is a pipeline-wiring/ordering
problem — the caller assembled an inconsistent `order` array — not a schema-shape
failure, so `ValidationError` (which is scoped to "a value failed a declared schema")
is not the closest fit; `ErrorDefaults.CONFIGURATION` (`code: 'CONFIGURATION_ERROR'`,
`retryable: false`, `statusCode: 500`) matches "invalid or missing config" precisely.

Replacement:
```ts
if (depIndex === -1) {
  throw ModuleError.create(
    `Engine.pipeline: task '${name}' requires '${dep}', which is missing from the pipeline entirely`,
    {
      'scenario': 'CONFIGURATION',
      'context':  { 'task': name, 'missingDependency': dep, 'operation': 'Engine.pipeline' }
    }
  );
}
```

---

**Site 7 — line 184-186, `pipeline()`, a `requires` dependency appears too late in the order.**

Current:
```ts
if (depIndex >= i) {
  throw new Error(
    `Engine.pipeline: task '${name}' requires '${dep}', which must appear earlier in the pipeline`
  );
}
```

Fit: `ModuleError` with `scenario: 'CONFIGURATION'` (same reasoning as Site 6 — pipeline
ordering, not schema shape).

Replacement:
```ts
if (depIndex >= i) {
  throw ModuleError.create(
    `Engine.pipeline: task '${name}' requires '${dep}', which must appear earlier in the pipeline`,
    {
      'scenario': 'CONFIGURATION',
      'context':  { 'task': name, 'dependency': dep, 'taskIndex': i, 'dependencyIndex': depIndex, 'operation': 'Engine.pipeline' }
    }
  );
}
```

---

**Site 8 — line 210-216, `run()`, `input` fails `InputSchema` validation.**

Current:
```ts
const inputResult = this.validator.validate(InputSchema, input);
if (!inputResult.valid) {
  const first = inputResult.errors[0];
  throw new Error(
    `Engine.run: input invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`
  );
}
```

Fit: `ValidationError`.

Replacement:
```ts
const inputResult = this.validator.validate(InputSchema, input);
if (!inputResult.valid) {
  const first = inputResult.errors[0];
  throw ValidationError.create({
    'path':    first !== undefined ? `input${first.path}` : 'input',
    'message': `Engine.run: input invalid: ${first !== undefined ? first.message : 'unknown error'}`,
    'violations': inputResult.errors.map((e) => ({ 'path': `input${e.path}`, 'message': e.message }))
  });
}
```

---

**Site 9 — line 219-225, `run()`, `input.roles` fails `RoleSchemaSchema` validation.**

Current:
```ts
if (input.roles !== undefined) {
  const rolesResult = this.validator.validate(RoleSchemaSchema, input.roles);
  if (!rolesResult.valid) {
    const first = rolesResult.errors[0];
    throw new Error(
      `Engine.run: input.roles invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`
    );
  }
}
```

Fit: `ValidationError`.

Replacement:
```ts
if (input.roles !== undefined) {
  const rolesResult = this.validator.validate(RoleSchemaSchema, input.roles);
  if (!rolesResult.valid) {
    const first = rolesResult.errors[0];
    throw ValidationError.create({
      'path':    first !== undefined ? `input.roles${first.path}` : 'input.roles',
      'message': `Engine.run: input.roles invalid: ${first !== undefined ? first.message : 'unknown error'}`,
      'violations': rolesResult.errors.map((e) => ({ 'path': `input.roles${e.path}`, 'message': e.message }))
    });
  }
}
```

---

**Site 10 — line 263-268, `run()`, final `state` fails `PaletteStateSchema` validation.**

Current:
```ts
const stateResult = this.validator.validate(PaletteStateSchema, state);
if (!stateResult.valid) {
  const first = stateResult.errors[0];
  throw new Error(
    `Engine.run: output state invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`
  );
}
```

Fit: `ValidationError`.

Replacement:
```ts
const stateResult = this.validator.validate(PaletteStateSchema, state);
if (!stateResult.valid) {
  const first = stateResult.errors[0];
  throw ValidationError.create({
    'path':    first !== undefined ? `state${first.path}` : 'state',
    'message': `Engine.run: output state invalid: ${first !== undefined ? first.message : 'unknown error'}`,
    'violations': stateResult.errors.map((e) => ({ 'path': `state${e.path}`, 'message': e.message }))
  });
}
```

---

**Site 11 — line 274-280, `run()`, `state.outputs[slot]` fails a plugin-contributed output schema.**

Current:
```ts
const slotResult = this.validator.validate(schema, slotValue);
if (!slotResult.valid) {
  const first = slotResult.errors[0];
  throw new Error(
    `Engine.run: outputs['${slot}'] failed plugin schema: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`
  );
}
```

Fit: `ValidationError`.

Replacement:
```ts
const slotResult = this.validator.validate(schema, slotValue);
if (!slotResult.valid) {
  const first = slotResult.errors[0];
  throw ValidationError.create({
    'path':    first !== undefined ? `outputs.${slot}${first.path}` : `outputs.${slot}`,
    'message': `Engine.run: outputs['${slot}'] failed plugin schema: ${first !== undefined ? first.message : 'unknown error'}`,
    'violations': slotResult.errors.map((e) => ({ 'path': `outputs.${slot}${e.path}`, 'message': e.message }))
  });
}
```

Preserves the exact substring `outputs['mySlot']` (with the concrete slot name
interpolated) required by `packages/core/tests/unit/Engine.test.ts:769`.

---

**Site 12 — line 288-294, `run()`, `state.metadata[slot]` fails a plugin-contributed metadata schema.**

Current:
```ts
const slotResult = this.validator.validate(schema, slotValue);
if (!slotResult.valid) {
  const first = slotResult.errors[0];
  throw new Error(
    `Engine.run: metadata['${slot}'] failed plugin schema: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`
  );
}
```

Fit: `ValidationError`.

Replacement:
```ts
const slotResult = this.validator.validate(schema, slotValue);
if (!slotResult.valid) {
  const first = slotResult.errors[0];
  throw ValidationError.create({
    'path':    first !== undefined ? `metadata.${slot}${first.path}` : `metadata.${slot}`,
    'message': `Engine.run: metadata['${slot}'] failed plugin schema: ${first !== undefined ? first.message : 'unknown error'}`,
    'violations': slotResult.errors.map((e) => ({ 'path': `metadata.${slot}${e.path}`, 'message': e.message }))
  });
}
```

Preserves the exact substring `metadata['myMeta']` required by
`packages/core/tests/unit/Engine.test.ts:814`.

That accounts for all 12 throw sites in `Engine.ts` (lines 80, 97, 118, 129, 155, 179,
185, 213, 222, 266, 278, 292 in the pre-migration file).

---

### `packages/core/src/registry/TaskRegistry.ts`

Add at the top of the file (after the existing `import type { ... } from '../types/index.ts';`):

```ts
import { ModuleError, ValidationError } from '@studnicky/errors';
```

**Site 1 — line 26-28, `register()`, `task.name === ''`.**

Current:
```ts
register(task: TaskInterface): void {
  if (task.name === '') {
    throw new Error('TaskRegistry.register: task.name is required');
  }
  this.entries.set(task.name, task);
}
```

Fit: `ValidationError` — this is a precondition/shape check on an input argument at a
public API boundary (empty string fails the implicit "non-empty name" constraint).

Replacement:
```ts
register(task: TaskInterface): void {
  if (task.name === '') {
    throw ValidationError.create({
      'path':    'task.name',
      'message': 'TaskRegistry.register: task.name is required'
    });
  }
  this.entries.set(task.name, task);
}
```

Preserves the lowercase `name` substring required by
`packages/core/tests/e2e/TaskRegistry.e2e.test.ts:309` (`register-empty` scenario) and
`packages/core/tests/unit/TaskRegistry.test.ts:266` (`register-nameless`).

---

**Site 2 — line 33-35, `hook()`, `task.name === ''`.**

Current:
```ts
hook(phase: LifecyclePhaseType, task: TaskInterface): void {
  if (task.name === '') {
    throw new Error('TaskRegistry.hook: task.name is required');
  }
  this.entries.set(task.name, task);
  ...
}
```

Fit: `ValidationError` (same reasoning as Site 1).

Replacement:
```ts
hook(phase: LifecyclePhaseType, task: TaskInterface): void {
  if (task.name === '') {
    throw ValidationError.create({
      'path':    'task.name',
      'message': 'TaskRegistry.hook: task.name is required'
    });
  }
  this.entries.set(task.name, task);
  ...
}
```

Preserves the lowercase `name` substring required by
`packages/core/tests/e2e/TaskRegistry.e2e.test.ts:322` (`hook-empty` scenario) and
`packages/core/tests/unit/TaskRegistry.test.ts:275`/`:284`
(`hook-nameless-start`/`hook-nameless-end`).

---

**Site 3 — line 45-50, `resolve()`, no task registered under `name`.**

Current:
```ts
resolve(name: string): TaskInterface {
  const task = this.entries.get(name);

  if (task === undefined) {
    throw new Error(`TaskRegistry.resolve: no task registered with name '${name}'`);
  }

  return task;
}
```

Fit: `ModuleError` with `scenario: 'NOT_FOUND'` — `name` is a plain string key lookup,
not a schema/shape validation; the failure is "the requested resource does not exist,"
which is exactly `ErrorDefaults.NOT_FOUND`.

Replacement:
```ts
resolve(name: string): TaskInterface {
  const task = this.entries.get(name);

  if (task === undefined) {
    throw ModuleError.create(`TaskRegistry.resolve: no task registered with name '${name}'`, {
      'scenario': 'NOT_FOUND',
      'context':  { 'taskName': name, 'operation': 'TaskRegistry.resolve' }
    });
  }

  return task;
}
```

Preserves the `does:not:exist` substring required by
`packages/core/tests/e2e/TaskRegistry.e2e.test.ts:333` (`resolve-missing` scenario) and
the general "expected throw" / `instanceof Error` check at
`packages/core/tests/unit/TaskRegistry.test.ts:126` (`resolve-unknown`).

That accounts for all 3 throw sites in `TaskRegistry.ts` (lines 27, 34, 49 in the
pre-migration file).

## 4. Call-site / signature impact

Searched `packages/*/src` and `packages/*/tests` (excluding `node_modules`) for any
code that pattern-matches on `Engine`/`TaskRegistry` error messages or on an
`Error.code`-style discriminant:

- **No production call site** (`packages/*/src`) catches or inspects errors thrown by
  `Engine.adopt`, `Engine.pipeline`, `Engine.run`, or any `TaskRegistry` method. The
  only in-repo consumer is `packages/core/src/quickPalette.ts`, which calls `engine.run`
  with no surrounding `try`/`catch` — errors are simply allowed to propagate, so its
  behavior is unaffected by the message/type change.
- **Test call sites** in `packages/core/tests/{unit,e2e,integration}/**` all assert with
  the pattern `assert.ok(err instanceof Error) && assert.ok(err.message.includes('<substring>'))`
  (see the specific line numbers cited per site above). Since `ValidationError` and
  `ModuleError` both extend `BaseError extends Error`, `instanceof Error` continues to
  pass. Every `.includes(...)` substring these tests check for has been deliberately
  preserved verbatim inside the `message` argument passed to `ValidationError.create`
  / `ModuleError.create` in §3 — no test changes are required by this migration.
- A `.code` property check exists only in `packages/cli/tests/unit/ConfigLoader.test.ts:119`
  and `packages/cli/tests/e2e/Cli.e2e.test.ts:94`, both matching on
  `NodeJS.ErrnoException.code` (filesystem `ENOENT` errors from `fs` calls unrelated to
  `Engine`/`TaskRegistry`) — not affected.
- Two other `.message.includes(...)` assertions exist in
  `packages/core/tests/integration/Pipeline.integration.test.ts:330,342` and
  `packages/core/tests/e2e/Engine.e2e.test.ts:494` (`'intentional bomb detonation'`,
  `'intentional pipeline failure'`, `'failure: [code=404]'`) — these check errors thrown
  by *test-fixture tasks* (`task.run()` bodies), not by `Engine`/`TaskRegistry`
  themselves. `Engine.run` does not wrap or catch task-thrown errors — it lets them
  propagate unchanged — so this migration does not touch them.
- `packages/core/src/registry/TaskRegistry.ts`'s public interface
  (`register`/`hook`/`resolve`/`has`/`list`/`hooks`) keeps identical parameter and
  return types; only the thrown value's runtime type changes (`Error` → `ValidationError`
  / `ModuleError`, both still `instanceof Error`). Same for every `Engine` method: no
  signature changes.
- No caller anywhere in the workspace does `catch (e) { if (e.message.includes(...)) }`
  style branching on `Engine`/`TaskRegistry` errors to select different recovery paths
  (the only conditional inspection found is the generic `instanceof Error` test guard
  above) — so there is no behavioral branch that a message-format change could silently
  break.

## 5. Verification checklist

Run from the repo root (`/Users/studs/Workspace/iridis`) after applying the §3 edits and
the §2 `package.json` dependency addition:

1. `npm install` — re-resolve `packages/core`'s lockfile entry for `@studnicky/errors`.
2. `npm run typecheck` (root) — first pass, to catch import/type errors across the
   workspace from the new `ValidationError`/`ModuleError` usages.
3. `npm run typecheck` (root) — **second pass**, to confirm the first pass's fixes (if
   any) didn't regress and the workspace is stable at a clean typecheck twice in a row.
4. `npm run lint` (root) or `litany lint` — confirm no unused-import / style violations
   from the new `@studnicky/errors` import lines.
5. `npm run test --workspace=packages/core` (or `cd packages/core && npm test`, i.e.
   `node --import tsx --test 'tests/**/*.test.ts'`) — run `packages/core`'s full unit +
   integration + e2e suite; every test cited in §3/§4 must still pass unchanged.
6. Run each other package's test suite (`cli`, `capacitor`, `contrast`, `image`, `rdf`,
   `stylesheet`, `tailwind`, `vscode`) since all of them depend on `@studnicky/iridis`
   (`packages/core`) and drive plugins through `Engine.adopt`/`Engine.run` — confirm
   none of their fixtures/tests assert on the old raw `Error` message format in a way
   this audit missed.
7. `litany inspect` / `/enginseer:quality-check` — full validator pass (architecture,
   exports, standards) before considering the migration complete, per this repo's
   pre-commit gate.
