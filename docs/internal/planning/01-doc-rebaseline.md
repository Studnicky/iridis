# Internal-docs re-baseline delta

Status: ready to apply. From the doc-drift survey (July 2026). The internal
planning docs were written for a "v0.1 pre-publish" state; the code is at
**v0.4.5** with a v0.4.0 schema-first breaking refactor since. This is the ordered
edit list to make the docs describe v0.4.5 truthfully. Edits are **not yet
applied** — this is the plan.

Verified against `CHANGELOG.md`, `packages/core/package.json` (0.4.5), a live core
test run (358 passing), `git log` (204 commits on develop), and direct source reads.

## Priority 0 — public-facing falsehood (fix first)

1. **`docs/getting-started.md:10`** — "The core ships with zero runtime
   dependencies." Now false: core depends on `ajv@^8.20.0` +
   `json-schema-to-ts@^3.1.1` since v0.4.0. This is the **only** stale claim in a
   published, user-facing doc. Rewrite to state the two deps and that math
   primitives ship as direct singletons.

## Priority 1 — HANDOFF.md

2. **`:7`** — delete "no commits pushed yet / do not commit until the user says
   so." Replace with present-state: live git-flow (develop/main), 204 commits,
   CI-gated releases through v0.4.5, `release.yml` workflow on tag push.
3. **`:42`** — remove `ColorMathRegistry` from the engine-spine sentence; it was
   deleted in v0.2.0 (math primitives are direct-import singletons now).
4. **`:63-64`** — rewrite "No Zod, no Ajv, no Yup" / "json-tology eligible target"
   to describe the actual ajv + json-schema-to-ts stack (Validator wraps ajv with
   a compile cache; schemas are still `as const` literals, typed via `FromSchema`).
5. **Top of file** — add a "current release: v0.4.5" anchor.

## Priority 2 — architecture.md

6. **`:17,92`** — replace "zero runtime deps" with the ajv/json-schema-to-ts list.
7. **`:80-90`** — rewrite the subpath table: core exposes **7** subpaths (`.`,
   `./model`, `./types`, `./registry`, `./engine`, `./math`, `./tasks`); plugins
   expose **2** (`.`, `./types`; cli adds `./Cli`). Drop "up to three."
8. **`:113-117`** — regenerate the math-primitive list from
   `packages/core/src/math/index.ts` (31 files, not 25): drop `srgbToDisplayP3`,
   `displayP3ToSrgb` (removed v0.2.0); add `oklchToRgbRaw`, `oklchToDisplayP3`,
   `gamutMapSrgb`, `clamp01`, `clamp`, `clusterMedianCutWeighted`,
   `clusterDeltaEMerge`.
9. **New section** — document the v0.4.0 **flat colon-namespaced slot grammar**
   (`state.outputs['plugin:slot']`, `state.metadata['plugin:slot']`), the
   `PluginInterface.schemas()` contract, and engine-exit validation. This is the
   single largest undocumented architectural fact. The old namespace-object
   pattern and `declare module` augmentation were both deleted.
10. **`:157-159`** — delete the entire "Docs theme bundle, CDN externals" section
    (removed v0.3.6). Flag the two vestigial `esm.sh` link tags in `config.ts` as
    cleanup (tracked in the UI audit).
11. **`:3`** — reframe "the v0.1 build" as present-state; add a "last verified
    against vX.Y.Z" stamp.

The pipeline task-name table (`:94-111`) is **still accurate** — v0.4.0 renamed
output slot keys, not task names. No change there.

## Priority 3 — outstanding.md (full rewrite, not a patch)

12a. `:9` — version `0.1.0` → `0.4.5`; drop "pre-publish, ship-ready."
12b. `:12` — "25 math primitives" → 31 (same delta as item 8).
12c. `:20,112` — "117 tests" → real counts: 358 in core alone, ~667 scenario rows
     workspace-wide (~700 per CHANGELOG). Update the invocation to the per-package
     `npm run test` scripts.
12d. `:32` — "hand-rolled inline validators" → ajv-backed `Validator`.
12e. `:45-59` — **delete** the "still queued" e2e table; all 7 plugin suites + CLI
     e2e exist (filenames landed as `<Plugin>.e2e.test.ts`, not `<Noun>...`).
12f. `:63-64` — **delete** the capacitor/RDF `existingCapacitor` boilerplate item;
     obsoleted by the v0.4.0 slot-grammar rewrite (grep confirms zero matches).
12g. `:66-70` — replace the manual "CLI smoke" instruction with a pointer to
     `packages/cli/tests/e2e/VueCapacitor.e2e.test.ts` (now automated).
12h. `:72-74` — MultiOutputDemo: precondition (per-plugin tests) is satisfied;
     the re-embed in markdown is the one part genuinely still open.
12i. `:78-87` — keep the 4 still-missing doc pages (`recipes/vscode-theme.md`,
     `reference/{plugins,tasks,math}.md`, confirmed absent); add the untracked
     `docs/reference/role-schema/` subsection that shipped in v0.3.0.
12j. `:89-100` — reword the json-tology roadmap line: not "deferred to v0.2," the
     codebase chose ajv/json-schema-to-ts instead in v0.4.0.
12k. `:102-108` — keep the "publish to npm?" question open (confirmed still 404 on
     the public registry), refresh the version/test numbers.

## No change needed

- **`docs/internal/test-pattern.md`** — written abstractly; survived the refactor.
  One optional precision note: state which packages have unit/integration/e2e
  folders (not all three everywhere).
- **README.md** — accurate. Optional soft flag: install commands are aspirational
  until the npm/GitHub-Packages publish actually ships (package is 404 today).
- **docs/getting-started.md** (besides `:10`) and **docs/index.md** — already
  reflect the v0.4.0 slot grammar and current API correctly.

## Genuinely-still-open items surfaced by this audit (feed into the roadmap)

- 4 doc pages missing: `recipes/vscode-theme.md`, `reference/{plugins,tasks,math}.md`.
- `<MultiOutputDemo>` built + registered but embedded in no markdown page.
- `@studnicky/iridis` not published to any registry yet (npm 404).
- `docs/reference/role-schema/` reference subsection is untracked on any board.
