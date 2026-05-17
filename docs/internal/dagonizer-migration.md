# Dagonizer migration plan

Status: scaffolding only. Branch `feature/dagonizer-engine`. Not yet implemented.

## Goal

Replace the iridis Engine's flat-array sequential executor with a Dagonizer-backed DAG runtime. Wins: step parallelism for independent tasks (especially the contrast enforce family), explicit directed flows, fan-out for per-role / per-pair work, checkpoint/resume, Mermaid pipeline viz.

Trade-off accepted: `@studnicky/iridis` drops the "zero runtime dependencies" claim. New runtime dep: `@noocodex/dagonizer` (currently linked locally via `npm link`, will switch to npm once published).

## Interface mapping

| iridis today | Dagonizer | Notes |
|---|---|---|
| `TaskInterface.name` | `NodeInterface.name` | direct |
| `TaskInterface.manifest.reads` | (informational) | not load-bearing in DAG; documents data deps |
| `TaskInterface.manifest.writes` | `OperationContract.produces` | direct mapping via FlowDeriver |
| `TaskInterface.manifest.requires` | DAG edge anchors | each requires entry becomes a predecessor edge |
| `TaskInterface.run(state, ctx)` | `NodeInterface.execute(state, ctx)` | task returns void via mutation; node returns `{ output: 'success' }` |
| `TaskInterface.manifest.phase` | entry/exit node placements | `onRunStart` and `onRunEnd` become `single` nodes flanking the main DAG |
| `PaletteStateInterface` (plain object) | class extending `NodeStateBase` | wraps the existing fields; adds `clone`, `collectError`, `getMetadata`, `lifecycle` etc. |
| `Engine.adopt(plugin)` | `Dagonizer.registerNode(...)` per task | unchanged consumer API; internally fans out to Dagonizer |
| `Engine.pipeline([...])` | `Dagonizer.registerDAG({ nodes: [...] })` | array becomes a chain of `single` placements; parallel groups become `parallel` placements |
| `Engine.run(input)` | `dispatcher.execute(dagName, state)` then await | returns the same `PaletteStateInterface` shape |

## Files

New files in `packages/core/src/engine/`:

- `PaletteState.ts` — class extending Dagonizer's `NodeStateBase` and carrying iridis's `colors`, `roles`, `variants`, `outputs`, `metadata`, `input`, `runtime` fields. Implements `clone()` deeply for fan-out safety.
- `taskToNode.ts` — wraps a `TaskInterface` into a `NodeInterface<PaletteState, 'success'>`. Single-output node, always routes to `success` after `task.run` returns. Error path collects into `state.errors` and routes to a (currently unused) `'error'` output.
- `pipelineToDag.ts` — compiles `Engine.pipeline(order)` into a `DAG` with `entrypoint = first task name` and `nodes = chain of single placements`. Phase-marked tasks become entry/exit nodes.

Modified files:

- `Engine.ts` — `run()` body replaced with: build state → build DAG → register on `Dagonizer` instance → execute → unwrap result. Keeps the same public method signature.
- `engine/index.ts` — re-export `PaletteState` for plugin authors.

Unchanged:

- `TaskInterface` and its consumers (all `intake:*`, `clamp:*`, `resolve:*`, `enforce:*`, `derive:*`, `emit:*` tasks). They keep working because `taskToNode` adapts them.
- `TaskRegistry`.
- `PaletteStateInterface` (the type) — `PaletteState` class implements it plus the `NodeStateInterface` methods.
- All plugin packages. They register tasks the same way; the engine adapts them internally.

## Phasing

1. **v0.4.0 — internal adapter ships.** Engine uses Dagonizer under the hood. Public API identical. 236 tests pass against the new runtime. No parallel placements yet (everything is `single`, same behavior as today). This is the "shake the integration" release.
2. **v0.5.0 — parallel placements.** Split the contrast enforce family into analyze + apply, place the four analyzers (`enforce:wcagAA-analyze`, `enforce:wcagAAA-analyze`, `enforce:apca-analyze`, `enforce:cvdSimulate-analyze`) in a `parallel` placement, single `apply:contrast` step downstream. Add fan-out for `intake:*` parsers. Mermaid pipeline viz on the docs site.
3. **v1.0.0 — DAG is the API.** Public surface switches to `Dagonizer`-shaped (registerDAG / execute). `TaskInterface` deprecated, `Engine` class removed. Plugin authors migrate. Major version bump.

## Open questions

- Does Dagonizer's `Validator.dag` accept programmatic DAG construction, or does it require the JSON Schema literal? `pipelineToDag` produces DAGs at runtime from the registered task list; need to confirm the validator path.
- Should `taskToNode` adopt Dagonizer's per-node `timeoutMs`? Useful for `gallery:histogram` on large images.
- Phase hooks (`onRunStart`, `onRunEnd`) — model as entry/exit `single` nodes, or use Dagonizer's `services` bag for cross-cutting concerns?
- Checkpoint persistence: do we expose `Checkpoint.from()` / `Checkpoint.restore()` on the iridis Engine API, or wait for v1.0.0?
- Dagonizer is currently linked via `npm link`. Iridis `package.json` declares `"@noocodex/dagonizer": "^0.4.0"` as a dependency. Once Dagonizer is published, `npm install` resolves from npm and the link goes away. Until then, every iridis clone needs to either `npm link @noocodex/dagonizer` or be ok with the dep failing to resolve.

## Test impact

- All 236 tests touch the engine indirectly via `engine.run()`. They should keep passing unchanged because the public API stays identical in v0.4.0.
- New tests to add: `taskToNode` adapter unit tests, `pipelineToDag` builder unit tests, integration test that runs the same pipeline through both old and new code paths and asserts byte-equal outputs.

## Risks

1. **State mutation semantics**: Dagonizer's `NodeStateBase.clone()` is deep-copy. If any iridis task relies on identity (`state.roles === something`) the clone path in fan-out will break it. Need to audit.
2. **Phase hooks**: Current `manifest.phase: 'onRunStart' | 'onRunEnd'` bypasses the main pipeline loop. Modeling them as DAG nodes changes their isolation guarantees.
3. **Error propagation**: Iridis tasks today can throw; engine catches and surfaces. Dagonizer nodes never throw — they return error outputs. Bridge layer in `taskToNode` catches throws and either re-throws (if Engine's contract is throw-on-error) or routes to `'error'` output.
4. **Build/typecheck**: Dagonizer's exports point at `dist/`. Iridis ships source. Workspace consumers of iridis-core get the Dagonizer dist transparently via node_modules resolution.

## Definition of done (v0.4.0)

- `Engine.run(input)` body uses Dagonizer internally.
- All existing tests pass (236+).
- Public API unchanged. Plugin authors see no difference.
- Mermaid pipeline diagram renderable for any registered pipeline (new method or new module).
- CHANGELOG entry under `[0.4.0]`.
- Migration plan removed from `internal/` once it's done.
