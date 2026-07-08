# Engine-spine decision memo

Status: proposed, awaiting sign-off. Prepared from the sibling-project survey (July 2026).

## Question

iridis hand-rolls its runtime spine: `Engine` + `TaskRegistry` (~425 LOC in
`packages/core/src/engine/` + `packages/core/src/registry/`) run tasks as a
single sequential `for`-loop with no parallelism, no state machine, no
cancellation, no caching. Three candidate directions compete for "what the
engine runs on":

- **A. Keep schema-first sequential** (current, shipped at v0.4.5).
- **B. Adopt Dagonizer** (`@studnicky/dagonizer`) DAG runtime — the abandoned
  plan on `feature/dagonizer-engine`.
- **C. Adopt substrate `Pipeline`** (`@studnicky/pipeline`) as the executor.

These are mutually exclusive as the *executor*. This memo settles which.

## Decision

**Keep the current sequential `Engine`/`TaskRegistry` (option A) and layer in
individual `@studnicky/substrate` primitives à la carte.** Do not swap the
executor for Dagonizer or substrate `Pipeline`.

## Evidence

1. **substrate `Pipeline` is a lateral move, not an upgrade.** Its `run()` is
   the same sequential `for`-loop shape as `Engine.run()` — verified by reading
   both. Swapping gains structured hook points but zero new capability.
2. **The capability the Dagonizer plan actually wanted — bounded-concurrency
   fan-out for the `enforce:contrast` family — is served directly by
   `@studnicky/batch`** (~110 LOC, one transitive dep) without adopting a DAG
   model, JSON-LD wire format, or deep-clone state semantics. And it pays off
   only once per-pair contrast work becomes async (WASM/worker kernels);
   `EnforceContrast.run` today is a synchronous CPU `for`-loop over pairs, so
   there is nothing to parallelize profitably yet.
3. **Dagonizer's one unmatched capability — checkpoint/resume — solves a problem
   iridis does not have.** `Engine.run()` is single-shot and
   synchronous-per-call: one `InputInterface` → one `PaletteState` in one pass.
   No long-running, resumable, multi-stage operation exists in the codebase.
4. **Dagonizer is a much larger surface than iridis needs.** Its dispatcher
   alone is 1215 LOC of LLM-agent / worker-container / egress-channel / embedded-
   DAG / plugin-marketplace machinery. Adopting it transitively pulls in most of
   substrate anyway (`@studnicky/{cache,clock,concurrency,fsm,json,...}` + ajv +
   json-schema-to-ts), wrapped in orchestration iridis will not use.
5. **The v2 "living color" thesis is better served by composing small
   primitives** against the existing `Engine` than by either framework's
   orchestration model (see mapping below). Blast radius stays small; the public
   API and the ~687 existing tests stay untouched.

Trade-off accepted either way: any of B/C or the à-la-carte primitives means
iridis-core takes on an `@studnicky/*` runtime dependency, ending the (already
lapsed) "zero runtime dependencies" claim — core has depended on `ajv` +
`json-schema-to-ts` since v0.4.0 regardless.

## substrate adoption map (à la carte, by need)

| iridis need | substrate pkg | Type | Effort |
|---|---|---|---|
| Palette state as explicit machine (idle → animating → interrupted) for v2 | `@studnicky/fsm` (`StateMachine` + `EffectInterpreter`) | New capability | M |
| Cancel in-flight recompute on rapid slider drag | `@studnicky/signal` (`Signal.compose`) | New capability, tiny | S |
| Animation-frame timing for v2 transitions (+ `VirtualScheduler` for deterministic tests) | `@studnicky/scheduler` | New capability | M |
| Memoize expensive recompute (APCA/WCAG/OKLCH) during live drag | `@studnicky/cache` (`LruCache`) | New capability | S |
| Bounded-concurrency fan-out for contrast-enforce family | `@studnicky/batch` | Enables the old DAG goal, once work is async | S (deferred) |
| Monotonic timing for frame deltas / perf | `@studnicky/clock` | New capability | S |
| Retry for future network-backed plugin tasks | `@studnicky/retry` | Speculative; opt-in, not core | S |

All eight substrate packages import zero `node:*` modules in `src/` (verified) —
they satisfy iridis-core's "Browser- and Node-safe" constraint, the same
constraint that got json-tology dropped in the first place.

**Ranked wins:** (1) `fsm` — highest leverage for v2, nothing models palette
state today; (2) `signal` — trivial, immediately useful for drag-cancel; (3)
`scheduler` + its `VirtualScheduler` — needed once animation exists, virtual/real
split keeps tests deterministic; (4) `batch` — correct fan-out primitive when
contrast work goes async. `@studnicky/pipeline` is the least valuable — identical
to what `Engine.run` already is.

## Sequencing

1. **Now (v0.4.x):** no engine change. Adopt `@studnicky/signal` where the docs
   dispatcher cancels in-flight `Engine.run()` (pairs with the UI debounce fix).
2. **v0.5.0 (v2 groundwork):** add `@studnicky/fsm` for palette state, `scheduler`
   for the animation loop, `cache` for per-frame memoization. This is the
   `iridis-anima` / `iridis-fsm` / `iridis-pulse` roadmap, built on substrate
   rather than hand-rolled.
3. **Later, only if needed:** `@studnicky/batch` for contrast fan-out once
   per-pair work is offloaded to async kernels. Revisit Dagonizer only if a real
   checkpoint/resume or multi-worker-distribution need emerges — nothing today
   justifies it.

## Disposition of `feature/dagonizer-engine`

Close it. It carries only `docs/internal/dagonizer-migration.md` (scaffold, never
implemented) plus a stale `packages/core/package.json` tweak that references the
wrong package name (`@noocodex/dagonizer`; the real package is
`@studnicky/dagonizer`). The full migration analysis is preserved in
[`appendix-dagonizer-migration-plan.md`](./appendix-dagonizer-migration-plan.md)
(originally commit `5170c4f`), so the branch can be deleted without losing it.
