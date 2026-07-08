# Appendix: Dagonizer migration plan (SUPERSEDED)

**Status: superseded — not adopted.** This is the original DAG-runtime migration
plan, scaffolded on the `feature/dagonizer-engine` branch (commit `5170c4f`,
2026-05-17) and never implemented. It is preserved here for the record after that
branch was closed. The decision to keep iridis's sequential engine and adopt
`@studnicky/substrate` primitives à la carte instead is in
[`02-engine-spine-decision.md`](./02-engine-spine-decision.md).

Two things to note reading it below: (1) it references the dependency as
`@noocodex/dagonizer` — the real published name is `@studnicky/dagonizer`;
(2) its stated v0.4.0 phasing never happened — develop's actual v0.4.0 was the
schema-first (ajv) refactor, a different direction.

---

## Dagonizer migration plan

Status: scaffolding only. Branch `feature/dagonizer-engine`. Not yet implemented.

### Goal

Replace the iridis Engine's flat-array sequential executor with a Dagonizer-backed
DAG runtime. Wins: step parallelism for independent tasks (especially the contrast
enforce family), explicit directed flows, fan-out for per-role / per-pair work,
checkpoint/resume, Mermaid pipeline viz.

Trade-off accepted: `@studnicky/iridis` drops the "zero runtime dependencies"
claim. New runtime dep: `@noocodex/dagonizer` (currently linked locally via
`npm link`, will switch to npm once published).

### Interface mapping

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

### Files

New files in `packages/core/src/engine/`:

- `PaletteState.ts` — class extending Dagonizer's `NodeStateBase` and carrying
  iridis's `colors`, `roles`, `variants`, `outputs`, `metadata`, `input`,
  `runtime` fields. Implements `clone()` deeply for fan-out safety.
- `taskToNode.ts` — wraps a `TaskInterface` into a
  `NodeInterface<PaletteState, 'success'>`. Single-output node, always routes to
  `success` after `task.run` returns. Error path collects into `state.errors` and
  routes to a (currently unused) `'error'` output.
- `pipelineToDag.ts` — compiles `Engine.pipeline(order)` into a `DAG` with
  `entrypoint = first task name` and `nodes = chain of single placements`.
  Phase-marked tasks become entry/exit nodes.

Modified files:

- `Engine.ts` — `run()` body replaced with: build state → build DAG → register on
  `Dagonizer` instance → execute → unwrap result. Keeps the same public method
  signature.
- `engine/index.ts` — re-export `PaletteState` for plugin authors.

Unchanged: `TaskInterface` and its consumers, `TaskRegistry`,
`PaletteStateInterface` (the type), all plugin packages.

### Phasing

1. **v0.4.0 — internal adapter ships.** Engine uses Dagonizer under the hood.
   Public API identical. 236 tests pass. No parallel placements yet.
2. **v0.5.0 — parallel placements.** Split the contrast enforce family into
   analyze + apply; place the four analyzers in a `parallel` placement, single
   `apply:contrast` downstream. Fan-out for `intake:*` parsers. Mermaid viz.
3. **v1.0.0 — DAG is the API.** Public surface switches to Dagonizer-shaped
   (registerDAG / execute). `TaskInterface` deprecated, `Engine` removed.

### Open questions

- Does Dagonizer's `Validator.dag` accept programmatic DAG construction, or
  require the JSON Schema literal?
- Should `taskToNode` adopt Dagonizer's per-node `timeoutMs`?
- Phase hooks (`onRunStart`, `onRunEnd`) — model as entry/exit `single` nodes, or
  use Dagonizer's `services` bag?
- Checkpoint persistence: expose `Checkpoint.from()` / `Checkpoint.restore()` on
  the iridis Engine API, or wait for v1.0.0?
- Dagonizer linked via `npm link` until published.

### Risks

1. **State mutation semantics**: Dagonizer's `NodeStateBase.clone()` is deep-copy;
   any task relying on identity breaks in fan-out. Audit needed.
2. **Phase hooks**: modeling `manifest.phase` as DAG nodes changes isolation
   guarantees.
3. **Error propagation**: iridis tasks throw; Dagonizer nodes return error
   outputs. Bridge in `taskToNode`.
4. **Build/typecheck**: Dagonizer exports point at `dist/`; iridis ships source.

### Definition of done (v0.4.0)

- `Engine.run(input)` uses Dagonizer internally. All existing tests pass (236+).
  Public API unchanged. Mermaid pipeline diagram renderable. CHANGELOG entry.
  Migration plan removed from `internal/` once done.
