# Frontend Substrate Remediation Plan

## Purpose

The GitHub Pages demo exposes a palette-resolution workflow. This plan defines a request-scoped, schema-admitted target architecture in which components communicate through one session event bus. That boundary supports deterministic browser interactions, SSR isolation, static deployment, and AI-assisted control without allowing an AI client to call Vue components or mutate reactive state directly.

The implementation target is the `site` application. The migration preserves the existing iridis engine contracts and output emitters while changing how the frontend admits interactions, schedules work, and exposes read models.

## Status

This is a future-architecture plan. `PaletteSession`, `PaletteSessionStore`, `PaletteSessionMachine`, and their bus topics are not current site modules.

The current 0.14.0 site separates image extraction from role resolution: the combine path ends after intake, histogram, candidate extraction, extraction, and harmonisation; the seed watcher performs the one role, contrast, and CVD resolution pass. The colour graph retains layout geometry across palette-only revisions and applies structural buffers only when its structure key changes. The visualization profile gate detects a frozen or severely delayed graph, carousel, or Mermaid viewport under its headless environment.

## Current Architecture Evidence and Risks

The current site has useful foundations:

- `site/app/composables/useIridisUiMachine.ts` owns one `EffectInterpreter` per Nuxt application through a `WeakMap`, and `site/test/iridisUiMachine.test.ts` verifies sharing within one app and isolation between concurrent SSR requests.
- `site/app/composables/useIridis.ts` creates per-app reactive state and registers the current UI-machine capability handlers.
- The site has a concrete UI machine with pure transitions and effect descriptors.

The palette workflow is nevertheless split across independent reactive execution paths:

- `useIridis.ts` observes a deep collection of palette inputs, debounces for 120 ms, then reconfigures, runs, and ingests the engine.
- `useMultiOutput.ts` observes overlapping inputs and builds a separate engine and output pipeline after the result area becomes visible.
- `useVscodeTierDemo.ts` computes a separate VS Code preview from its own refs and a watcher on framing.
- The application has broad direct composable use: static source inventory finds 49 files that reference `useIridis` and 13 that reference `useIridisUiMachine`; the component subset contains many independent callers. This permits a component to read or mutate workflow state without a common admission, correlation, or revision boundary.

That split creates the following risks:

| Risk | Consequence | Target control |
| --- | --- | --- |
| Independent watchers coordinate engine work and projections | A view can consume a result through a separate reactive path | One session command path and one resolution scheduler |
| Independent reactive refs represent related state | A view can render a different revision than the generated output | Monotonic session revision carried through facts and read models |
| Effects call capability handlers directly | An interaction has no transport-neutral audit boundary | Schema-admitted intent envelopes on a session bus |
| Independent output and VS Code computations | The demo can show results derived by different pipelines | One engine session produces canonical resolution facts; projections derive all views |
| Component-level orchestration | AI automation would need implementation-specific component knowledge | Tool commands validate to the same intent entities as human interactions |

## Available Substrate Inventory

The inventory is based on `site/package.json` and `pnpm-lock.yaml`. “Direct” means the package is declared by the site; “installed” means it is available through the workspace lockfile but is not a direct site dependency.

| Module | Version present | Site dependency status | Plan use |
| --- | --- | --- | --- |
| `@studnicky/fsm` | 15.2.1 | Direct site dependency | Retain as the sole transition authority. |
| `@studnicky/store` | 15.2.1 | Installed, not direct | Add as a direct dependency for request-scoped session state and selector subscriptions. |
| `@studnicky/event-bus` | 15.2.1 | Installed, not direct | Add as a direct dependency for typed intent, fact, error, lifecycle, and read-model topics. |
| `@studnicky/signal` | 15.2.1 | Installed, not direct | Add only behind the session adapter when it is required by store or event-bus subscriptions; do not expose signals to components. |
| `@studnicky/scheduler` | 15.2.1 | Installed, not direct | Add as a direct dependency for revision-aware resolution scheduling. |
| `@studnicky/concurrency` | 15.2.1 | Installed, not direct | Add only for the bounded latest-revision worker and cancellation/coalescing policy. |
| `@studnicky/cache` | 15.2.1 | Installed, not direct | Use only for bounded, derived memoization keyed by admitted input fingerprints; it never stores uploaded pixel data. |
| `@studnicky/timing` | 14.0.0 only | Installed, not direct, version-skewed | Do not introduce as a direct dependency until it is available at the 15.2.1 substrate line or a compatibility decision is recorded. |

The lockfile also contains older transitive 14.0.0 records for several substrate packages. The session boundary uses one explicit 15.2.1 direct dependency set before any new imports are added. It does not mix direct 15.2.1 APIs with a direct 14.0.0 timing API.

## Planned Target Architecture

This section specifies the future architecture; `PaletteSession`, `PaletteSessionStore`, `PaletteSessionMachine`, and their topics are not current site modules. After Phases 0–7 land, each Nuxt application or SSR request will own exactly one `PaletteSession`. Its store, event bus, FSM interpreter, engine capability, scheduler, subscriptions, and disposal lifecycle will share that scope.

```text
Vue component / AI tool
        |
        | validated PaletteInteractionEnvelope
        v
  intent topic ──> PaletteSessionMachine ──> effect descriptors
                           |                         |
                           |                         v
                           |                  engine capability
                           v                         |
                  fact / error topics <──────────────┘
                           |
                           v
          revisioned read-model topics and selectors
                           |
                           v
                    Vue presentation components
```

### Planned Session Store

`PaletteSessionStore` will be the application-facing port. It will expose only:

- `publishIntent(envelope)` for validated interaction envelopes;
- selector subscriptions for versioned read models;
- request-scoped lifecycle disposal;
- query accessors that return immutable read-model snapshots.

It will not expose raw Vue refs, engine instances, interpreter instances, or component callbacks. A Nuxt-app `WeakMap` registry will create and dispose one store per app/request, matching the existing SSR isolation model.

### Planned Bus and Topic Classes

The planned bus will distinguish transport intent from observed fact and derived presentation state. Each topic will carry an entity type, an owning publisher, and delivery semantics.

| Topic class | Name pattern | Sole publisher | Consumers | Delivery policy |
| --- | --- | --- | --- | --- |
| Intent | `palette.session.intent` | Components and validated tools through the store | FSM admission handler | Ordered; invalid input never enters the topic |
| Fact | `palette.session.fact` | Session effects | Read-model projectors, diagnostics | Ordered by session revision |
| Error | `palette.session.error` | Admission, engine, or projection boundary | Error read model, diagnostics | Durable for the active revision |
| Lifecycle | `palette.session.lifecycle` | Session owner | Scheduler and resource adapters | `created`, `hydrated`, `disposed` only |
| Read model | `palette.session.read-model.<name>` | Projectors | Selector adapters and components | Latest value; new subscribers receive current snapshot |

Required read models will be `input`, `resolution`, `outputs`, `vscode-preview`, `interaction-status`, and `diagnostics`. The output and VS Code projections will consume the same resolution fact; neither will recreate a palette engine.

### Planned Component Rule

A migrated component will publish a schema-admitted interaction envelope through `PaletteSessionStore.publishIntent` and subscribe through a named read-model selector. It will not call another component, call an engine, invoke a composable that mutates session state, construct an FSM event, or retain a component callback as a workflow capability.

Presentation-local state will remain local when it has no workflow meaning: focus, tooltip visibility, temporary pointer coordinates, and animation frame state will not enter the session bus. A local state transition will become an intent only when it changes palette input, selected output, persistent view mode, engine work, or an AI-observable result.

## Planned Schema-Backed Interaction Contract

All planned bus messages will be canonical entities created at admission. Input validation will occur once at the store boundary. Downstream handlers will receive only entity instances and will not parse raw DOM, AI-tool, query-string, or image payloads.

### Common Envelope

`PaletteInteractionEnvelopeEntity` will contain:

| Field | Contract |
| --- | --- |
| `eventId` | Unique immutable event identifier. |
| `schemaVersion` | Contract revision for replay and tool compatibility. |
| `topic` | One of the registered topic names. |
| `interaction` | Registered interaction identifier; it is the discriminant for the payload entity. |
| `origin` | `human`, `assistant`, `system`, or `hydration`. |
| `correlationId` | Identifier shared by one user or tool request and all resulting facts. |
| `causationId` | Optional originating `eventId`; absent only for session bootstrap. |
| `revision` | Non-negative session revision assigned by the admission authority. |
| `payload` | Interaction-specific canonical payload entity. |
| `issuedAt` | Admission timestamp for diagnostics and ordering, not a source of business state. |

A fact envelope will have the same tracing fields plus `fact`, `payload`, and the input fingerprint used to produce it. An error envelope will have the same tracing fields plus a `PaletteSessionErrorEntity`.

### Payload Entities

The planned registry will supply one closed entity for each interaction. Examples include:

| Interaction | Payload entity | Required fields |
| --- | --- | --- |
| `palette.seed.set` | `SetPaletteSeedPayloadEntity` | `index`, normalized six-digit `hex`, optional `role` |
| `palette.seed.add` | `AddPaletteSeedPayloadEntity` | optional normalized seed |
| `palette.seed.remove` | `RemovePaletteSeedPayloadEntity` | `index` |
| `palette.seed.pin-role` | `PinPaletteSeedRolePayloadEntity` | `index`, optional role name |
| `palette.mode.select` | `SelectPaletteModePayloadEntity` | `mode` |
| `palette.schema.select` | `SelectRoleSchemaPayloadEntity` | registered schema name |
| `palette.framing.select` | `SelectFramingPayloadEntity` | `light` or `dark` |
| `palette.contrast.set` | `SetContrastStrictnessPayloadEntity` | bounded strictness value |
| `palette.derivation.configure` | `DerivationConfigurationPayloadEntity` | canonical derivation configuration |
| `palette.image.select-candidate` | `SelectImageCandidatePayloadEntity` | normalized candidate colors and label; never raw pixels |
| `palette.output.select` | `SelectOutputPayloadEntity` | registered output identifier |
| `palette.vscode.configure` | `ConfigureVscodeTierPayloadEntity` | supported tier, palette identifier, and role edits |
| `palette.diagram.command` | `DiagramCommandPayloadEntity` | registered pan, zoom, fit, reset, or expansion command |

The image boundary will normalize externally supplied files. The session will persist only the derived candidate colors, an asset identifier or fingerprint when needed for UI correlation, and error metadata. Raw images and pixel buffers will remain transient in the image adapter and will be released after extraction.

### Result and Error Entities

`PaletteResolutionResultEntity` will contain the canonical input fingerprint, revision, resolved roles, contrast/provenance reports, emitter outputs, and deterministic diagnostics emitted by iridis. `PaletteSessionErrorEntity` will contain a stable `code`, human-readable `message`, `fieldPaths`, `correlationId`, `revision`, and `retryable` boolean. It will never transport an untyped thrown object.

A read-model snapshot will contain `revision`, `status`, `value`, and any current error entity. A selector will ignore snapshots older than the revision it has rendered.

## Planned FSM: Single Transition Authority

`PaletteSessionMachine` will replace multiple independent workflow watchers. It will be the only authority that turns an admitted intent into effects. The existing carousel drag state will become a nested `ready.dragging` mode in this machine rather than a separate mutation path.

| State | Accepted event | Transition | Effects |
| --- | --- | --- | --- |
| `bootstrapping` | `session.bootstrap` | `ready.idle` | publish initial input/read models; schedule initial resolution |
| `ready.idle` | valid mutating intent | `resolving` | apply immutable input change, increment revision, publish input fact, enqueue resolution |
| `ready.dragging` | drag move | `ready.dragging` | publish ephemeral interaction read model only |
| `ready.dragging` | drag end or mode selection | `ready.idle` or `resolving` | settle drag; when input changes, apply and enqueue one revision |
| `resolving` | newer valid mutating intent | `resolving` | increment revision, publish input fact, replace queued work with latest revision |
| `resolving` | matching resolution succeeded | `ready.idle` | publish resolution fact, then project outputs and VS Code preview |
| `resolving` | matching resolution failed | `failed` | publish typed error and diagnostic facts |
| `failed` | valid mutating intent or retry | `resolving` | clear transient error, apply/reuse input, enqueue resolution |
| any live state | `session.dispose` | `disposed` | unsubscribe, cancel queued work, release transient image data |
| `disposed` | any event | `disposed` | reject with typed lifecycle error |

The engine effect will receive a fully normalized input snapshot and return a result or typed error for the same revision. A stale completion will be recorded only as an optional diagnostic; it will never overwrite a newer read model.

## Planned Lifecycle, Backpressure, and SSR

- The Nuxt-app request key will own the bus, store, machine, and engine capability. Module-level singleton state will be prohibited for session data.
- Server rendering will create a request-scoped session and resolve only the SSR-safe bootstrap input. Client hydration will adopt the serialized canonical snapshot, then start browser-only image and observer work after mount.
- GitHub Pages will remain static: the architecture will need no server process, shared memory, websocket, or cross-visitor queue.
- The scheduler will preserve ordered accepted intents but coalesce pending engine work to the newest revision. At most one engine run will be active per session. Completion will apply only if its revision equals the store's active revision.
- Read-model topics will be latest-value topics with bounded subscriber work. Expensive projections will run after the canonical resolution fact and will be skipped for stale revisions.
- Derived memoization keys will include the canonical input fingerprint, output set, and engine configuration. Cache entries will be bounded; raw uploads and pixel data will never be cache values.
- Consumers will subscribe before publishing the request that requires a response. This will keep tool and worker-like protocols deterministic and prevent a fast fact from being missed.

## Planned AI-Assisted Demo Contract

The planned demo will adopt Leadography's relevant boundary patterns: typed ingress and facts, pure reducers with effect descriptors, validated tool schemas mapped to events, correlation metadata, and subscribe-before-send sequencing. It will maintain separate intent, fact, error, lifecycle, and read-model topic classes.

The planned AI surface will have two ports:

| Port | Examples | Rules |
| --- | --- | --- |
| Command tools | `set_palette_seed`, `select_schema`, `configure_vscode_tier`, `select_image_candidate`, `retry_resolution` | Tool arguments validate through the entity registry, become intent envelopes, and enter `palette.session.intent`. Tools cannot import Vue components, call composables, or mutate the store directly. |
| Query tools | `get_palette_session`, `get_resolution`, `get_output`, `explain_diagnostics` | Dedicated query handlers read immutable named read models. They do not send commands, run the engine, or access component instances. |

Every command response will return the accepted `eventId`, `correlationId`, assigned `revision`, and an acknowledgement. A tool that needs a final result will subscribe to the relevant fact or read-model topic before publishing its command, then return only the result whose correlation and revision match. The LLM may narrate deterministic resolution facts and diagnostics; it will not decide palette resolution or invent output values.

## Phased Remediation

Each phase will land with its tests before dependent work begins. Ownership boundaries will prevent components from bypassing the new session port.

| Phase | Owned modules/files | Deliverable | Acceptance evidence |
| --- | --- | --- | --- |
| 0. Contract baseline | `site/app/composables/entities/`, `site/test/` | Entity registry, fixtures, contract tests, and current behavior snapshots | Every declared intent accepts canonical valid input and rejects invalid raw input; existing SSR isolation tests remain green. |
| 1. Dependency alignment | `site/package.json`, `pnpm-lock.yaml` | Direct 15.2.1 store/event-bus/scheduler/concurrency/cache dependencies; no direct timing dependency | Frozen install passes; dependency graph has one direct substrate API line; no new 14.0.0 direct dependency. |
| 2. Session foundation | `site/app/composables/paletteSession/` | `PaletteSessionStore`, request registry, typed topic catalog, lifecycle disposal | Two SSR requests cannot observe each other's event, state, or subscription; one app shares one session. |
| 3. State authority | `site/app/composables/paletteSession/fsm/` and existing `fsm/` migration boundary | `PaletteSessionMachine` with pure reducer/effects and revision discipline | Transition-table tests cover every state/event pair; stale completions cannot update a read model. |
| 4. Engine and projection adapters | `useIridis.ts`, `useMultiOutput.ts`, `useVscodeTierDemo.ts`, `paletteSession/adapters/` | One engine capability and canonical resolution fact; output and VS Code read-model projectors | One admitted input revision invokes one canonical resolve operation; CSS, JSON, component-library, RDF, and VS Code outputs report the same revision and input fingerprint. |
| 5. Component migration | `site/app/components/content/`, `site/app/components/layout/` | Components use store commands and selectors only | Static boundary test rejects direct imports of engine, interpreter, or sibling component capabilities from presentation components; interaction tests use topic contracts. |
| 6. AI tool boundary | `site/app/tools/` or an explicitly named site integration directory, schema registry tests | Command/query tool adapters with correlation protocol | Invalid tool args produce typed admission errors; valid tools produce the same facts as equivalent human actions; no tool imports `.vue` files. |
| 7. Resilience and performance | `site/test/`, `site/visualization-profile.mjs`, focused session instrumentation | Backpressure, teardown, accessibility announcement, and performance evidence | Rapid input sequence has bounded active engine work, no stale visible result, no retained raw image data, and no leaked subscriptions after disposal. |

### Measured Acceptance Targets

Before Phase 7 is complete, establish a baseline in the repository and enforce the following assertions against it:

- One accepted mutation produces at most one canonical engine resolution for its revision.
- A burst of input revisions keeps active engine work at one session task and renders only the newest completed revision.
- A disposed session has zero active topic subscriptions, scheduled tasks, and retained transient image buffers.
- Two simultaneous SSR app contexts have distinct stores, buses, revisions, and read models.
- Hydration renders the same canonical bootstrap palette before browser-only enhancements begin.
- The Pages build remains static and succeeds without a server runtime dependency.
- Components can be tested with a session-store test double and do not require sibling component mounts to exercise an interaction.

## Migration Constraints

- Preserve the existing request-scoped SSR isolation contract.
- Preserve static GitHub Pages generation and deployment.
- Preserve iridis engine inputs, outputs, role schemas, contrast/provenance reports, and package emitter semantics.
- Do not add a parallel palette engine, a second resolution algorithm, or separate output-generation logic.
- Do not persist raw image files, pixel buffers, or raw browser file objects in stores, events, caches, or serialized hydration state.
- Keep external data at the intake boundary until it becomes a canonical entity.
- Maintain accessible announcements through read models rather than component-to-component imperative calls.
- Migrate one interaction family at a time; a component changes only after its session command and read-model selector have contract tests.

## Non-Goals

- Replacing Nuxt, Vue, the iridis engine, or existing role schemas.
- Introducing a server-side event broker, multi-user collaboration channel, or durable event log for a static demo.
- Treating local animation, focus, hover, or pointer-only state as a global workflow event.
- Letting an AI client execute Vue methods, access DOM component instances, or choose engine results.
- Directly depending on the version-skewed 14.0.0 timing package.

## Decisions

| Decision | Status | Rationale |
| --- | --- | --- |
| One request-scoped `PaletteSessionStore` and event bus | Planned | It retains the site's SSR isolation pattern while creating one interaction boundary. |
| `@studnicky/fsm` remains the sole transition authority | Planned | The site already has pure UI-machine transitions and an effect interpreter. |
| Separate intent, fact, error, lifecycle, and read-model topics | Planned | Transport semantics and subscription behavior remain explicit rather than overloading one event stream. |
| Revision is assigned at session admission | Planned | Engine work, outputs, diagnostics, and UI can reject stale results consistently. |
| Outputs and VS Code preview project from canonical resolution facts | Planned | It removes independent engine construction while preserving existing emitters. |
| Add direct substrate dependencies only at 15.2.1 | Planned | The lockfile has 15.2.1 implementations; timing remains 14.0.0-only and is excluded. |
| AI commands use the same entities and intent topic as human input | Planned | Human and AI interaction receive identical validation, correlation, and state-machine behavior. |
