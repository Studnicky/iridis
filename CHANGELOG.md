# Changelog

All notable changes to iridis are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

- Standardized card and section styling across the docs site's demo components: unified eyebrow-label typography, card-title scale, and border-radius/color conventions; converted hand-rolled pill-nav buttons in `TableOfContentsBar` and `CylinderCarousel` to `UButton`
- The carousel's Pipeline card no longer duplicates the data-flow diagram already shown in the docs section below — it now links to it instead
- The "pin to role" seed control is now a compact hover-expand dropdown grouped by role category, replacing an unbounded tag-cloud of buttons that could grow wider than its card and disable roles already pinned elsewhere (clicking a taken role now swaps the pin instead)

### Fixed

- Broken `keyboard-arrow-left`/`keyboard-arrow-right` icon names in the pipeline diagram's D-pad controls (that icon family only ships `-rounded` variants for up/down)
- The pipeline diagram's full-screen mode being clipped or mispositioned when rendered inside a 3D-transformed carousel card ancestor, by teleporting the expanded view to `<body>`

## [0.8.0] - 2026-07-11

### Added

- Shared `LearnMoreSection.vue` accordion component, replacing 5 independently-built "Learn more" implementations across the demo cards with one consistent, collapsible pattern
- FSM wiring for the pipeline diagram's reset/fit controls (`DIAGRAM_RESET`/`DIAGRAM_FIT`), previously defined and handled but never dispatched
- A build-time source-snippet import (`<<< @/path#region`), resolved via Nuxt Content's `content:file:beforeParse` hook, so docs can embed real, drift-proof source instead of hand-typed paraphrases
- Server-side rendering (`ssr: true`) for `site/`, prerendered via `nuxt generate` — real content is now baked into the static HTML for crawlability instead of an empty client-hydrated shell
- Restructured the docs from 4 monolithic pages into 12 focused cards, ordered from least to most technical, several now embedding real source via the snippet-import mechanism
- A navigation-target table (`useNavigationTargets.ts`) and a new `NAVIGATE_TO_TARGET` FSM action/effect — every internal navigation path (carousel dots, ToC bar, prose cross-references) now resolves through one addressable registry, groundwork for a future navigation-helper feature

### Changed

- Typed the engine metadata bag in `useIridis.ts`, replacing 5 unchecked `as any` casts with real types grounded in the actual task-output shapes
- Extracted the carousel's section list into `CarouselSections.ts` as a single source of truth

### Fixed

- `CodeBlock.vue`'s Shiki highlighting only ran on prop *changes*, never on initial mount — every fenced code block on the docs pages was invisible. Fixed with a top-level `await` so SSR/prerender waits for the highlighted HTML.
- A leaked `keydown` listener and missing `aria-label`s on the pipeline diagram's icon-only controls
- Two card titles containing an unquoted YAML colon (`Roadmap: Living Color`, `Recipe: Vue + Capacitor...`) were parsed as nested mappings instead of strings, rendering as `[object Object]`
- Jarring instant anchor-jump scroll, replaced by smooth FSM-routed navigation
- Carousel side cards silently widening the whole page's horizontal scroll area, which a native `scrollIntoView` call (from the new doc-anchor navigation) could then shove sideways

## [0.7.1] - 2026-07-11

### Changed

- Retired the VitePress docs site (`docs/`) and consolidated on the Nuxt app (`site/`) as the single app — it now runs the engine live, doubles as the interactive demo, and hosts all documentation
- Ported genuine documentation content (pipeline, contrast, color-space, and role-schema concepts; color-model and role-schema reference; recipes; getting-started; the v2 roadmap) into `site/` as enriched "Learn more" detail sections on the existing demo cards and into `site/content/*.md`
- Moved internal engineering notes from `docs/internal/` to `NOTES/` at the repo root

### Removed

- `docs/` (VitePress site), its duplicate demo components, its own FSM (`themeDispatcher.ts`), and its projector — all superseded by `site/`'s existing, tested `IridisUiMachine` FSM and pipeline wiring
- Orphaned nested `site/package-lock.json`; the workspace uses a single root lockfile

### Fixed

- `MultiOutput.vue` now adopts the `@studnicky/iridis-rdf` plugin, which was a declared dependency but was never actually adopted — adds an RDF/Turtle output tab
- Release pipeline (`scripts/stamp-version.mjs`, `.github/workflows/release.yml`) updated to reference the relocated `readme-header.svg`/`readme-header.svg.template` at the repo root instead of the now-deleted `docs/public/`

## [0.7.0] - 2026-07-10

UI theming polish, component layout refinements, and accessibility improvements.

### Added

- **Clamps view in carousel** shows seed-to-resolved envelope corrections visually
- **Dynamic button row balancing** (BalancedWrap component) distributes items optimally across viewport
- **Mermaid diagram enhancements** with improved centering and theme styling
- **Increased ambient stars** with rotating animation layers for enhanced visual ambiance
- **ProsePre syntax highlighting override** for unified code block styling

### Changed

- Replaced Carousel with CSS grid in PaletteCarousel for better layout control
- Moved Mermaid diagram from PipelineExplainer to bottom of index.vue
- Updated role schema controls to marked slider
- Refactored TableOfContentsBar with BalancedWrap for improved tab distribution
- Enhanced MultiOutput format targets layout with BalancedWrap
- Improved HeroBanner and RoleClamps component layouts

### Fixed

- **ModeSwitch casting issue** causing FSM desynchronization
- **D-pad in MermaidDiagram** and set default wheel behavior to zoom
- **CVD hydration errors** and SVG attribute bindings
- **WCAG contrast enforcement** for active navigation and solid buttons using engine-generated contrast tokens
- **Color picker sluggishness** by changing event from @input to @change
- **CSS specificity** of SSR-injected tokens to override Nuxt UI defaults
- **Style bouncing on hydration** by removing imperative Tokens.apply mutation
- **UI contrast and state regressions** with derivation explanations
- **Theme token generation** and CSS styling improvements
- **Nuxt configuration refinements** for better UX

## [0.6.1] - 2026-07-09

### Fixed

- **`npm ci` failed in CI with `Missing: search-insights@2.17.3 from lock file`**, which silently blocked the "Deploy docs to GitHub Pages" workflow. `search-insights` is only an optional peer of `@docsearch/react` (pulled in transitively via `vitepress`), and npm's optional-peer auto-install resolves inconsistently across environments. Pinned as an explicit devDependency so lockfile resolution is deterministic.

## [0.6.0] - 2026-07-09

CVD correction, real syntax highlighting, and site-wide accessibility/UI polish.

### Added

- **`enforce:cvdSimulate` can now correct color-vision-deficiency failures, not just warn.** Set `input.contrast.cvdCorrect: true` and a failing pair is walked along the OKLCH lightness axis (mirroring `ensureContrast`'s idiom), then desaturated as a fallback, until every failing CVD type clears its threshold or the search budget is exhausted — gated so the pair's trichromat contrast never regresses below its pre-correction baseline. `state.metadata['contrast:cvd']` gains a `corrections` array reporting which pairs were fixed and which CVD types (if any) still fail. Simulate-only mode (the default) is unchanged.

### Fixed

- **`packages/vscode` token derivation had a units bug** that could clamp derived syntax-highlight colors straight to black: `DERIVATION_PARAMS.sat`/`.light` are percentage-point magnitudes, but `ExpandTokens.ts` passed them directly into `lighten`/`darken`/`saturate`/`desaturate`, which expect a raw 0–1 (lightness) / 0–0.5 (chroma) delta. Values are now divided by 100 before use.
- **JSON/JS syntax highlighting was under-differentiated** (2 colors instead of 4+) whenever fewer than the full 16 seeds were pinned. The accent-role chain (`keyword → type/function → variable/string → number → constant`) had no `hue`/`hueOffset` on most roles, so `ExpandFamily`'s hue fallback (unchanged source hue) collapsed the whole chain onto ~2 hue families. Added `hueOffset` across the chain in `vscodeRoleSchema16.ts` so it fans out across the wheel regardless of how sparse the seed set is. Also added `jsonKey`, `boolean`, `constant`, and `punctuation` to `VscodeTokenData.TOKEN_TYPES`, which previously had no derived color at all and silently fell through to default/black text.

## [0.5.0] - 2026-07-07

Synchronous engine and complete engine-driven palettes.

### Breaking

- **The engine is synchronous.** `Engine.run(input)` returns `PaletteStateInterface` directly (was `Promise<PaletteStateInterface>`); `TaskInterface.run` returns `void` (was `Promise<void> | void`); `quickPalette()` returns `QuickPaletteInterface` (was a Promise). Every pipeline task is deterministic, synchronous CPU work — the only async task, `reason:serialize`, now serializes n3 output synchronously (its writer callback is already synchronous for in-memory string output). Existing `await engine.run(...)` call sites keep working (awaiting a non-Promise returns the value); only `.then()` callers and the TypeScript return types change.

### Added

- **`hue` and `hueClamp` on role definitions.** A role may declare `hue` (OKLCH degrees, [0, 360)) as a target that takes precedence over the relative `hueOffset` in every resolution path — `resolve:roles` for directly-assigned roles and `expand:family` for `derivedFrom` roles. On its own `hue` pins the hue absolutely; paired with `hueClamp` it becomes a **bounded nudge** — the resolved color rotates toward the target by at most `hueClamp` degrees along the shortest arc, so semantic roles lean toward their meaning (`success` → green) while staying rooted in the actual palette (a red-dominant image yields a warm-leaning `success`, not a pure green absent from the theme). Previously `hueOffset` meant "absolute" in `resolve:roles` but "relative to the source" in `expand:family`; `hue`/`hueClamp` remove that ambiguity.
- **`lightnessTarget` on variant config.** `derive:variant` entries accept `lightnessTarget` (absolute OKLCH lightness), taking precedence over `lightnessOffset`. An array of targeted variant configs produces a full engine-resolved tonal scale (e.g. an 11-stop 50→950 ramp) through `colorRecordFactory`, so consumers read tonal steps off `state.variants` instead of computing ramps downstream.

## [0.4.5] - 2026-05-19

### Fixed

- **Image-mode theming** now drives the docs cascade end-to-end. `ImageToTheme` was reading `state.metadata['gallery'].dominantColors` and `.histogram`, but the engine writes outputs to the colon-prefixed `state.metadata['gallery:dominantColors']` and `state.metadata['gallery:histogram']` keys. The extractor silently produced an empty seed list every run, so `configStore.paletteColors` never updated and dropping an image or picking a preset left every `--iridis-*` variable on the page unchanged. The component now reads the canonical keys; the spectrograph and the docs-wide theme both track the extracted palette and re-resolve through dark/light framing toggles.
- **WCAG / APCA role badges** in `BuildResolvedRoles` were sourced from a non-existent `state.metadata['wcag']` blob. The contrast plugin writes three separate keys — `state.metadata['contrast:aa']`, `['contrast:aaa']`, `['contrast:apca']`. `roleBadge` now reads each key directly so the AA / AAA / APCA·Bronze indicators render again.

## [0.4.4] - 2026-05-18

### Changed

- **README structure** trimmed to match the json-tology pattern: composite header SVG up top, then concise Documentation / Requirements / Install / License / Changelog sections. The long-form usage walkthroughs that previously lived in the README are kept on the docs site.
- **Composite header SVG** (`docs/public/readme-header.svg`) replaces the standalone `iridis-node.svg`. The new SVG is 1280×320, base64-embeds `docs/public/logo.png` on the left, and renders the wordmark + version pill + tagline + palette swatches on the right. Single asset, self-contained, used by both the README and the release-publish workflow.

### Removed

- `docs/public/iridis-node.svg` and its template — superseded by `readme-header.svg`.

## [0.4.3] - 2026-05-18

### Fixed

- **README header image now uses the sidebar logo.** v0.4.2 shipped with a brand-new hex-node SVG drawn from the favicon vector. The README image is supposed to match the rest of the site — every other surface (VitePress sidebar, favicon, apple-touch-icon, msapplication-TileImage) renders `docs/public/logo.png`. The versioned SVG now base64-embeds `logo.png` directly so the README, GitHub release pages, and the docs site all show the same artifact. Version pill below the image unchanged.

## [0.4.2] - 2026-05-18

Docs and release-pipeline polish.

### Added

- **Versioned README header.** Replaces the static logo with a brand-styled `iridis-node` hex SVG that carries the current release version in a pill below the wordmark. The SVG is referenced via `raw.githubusercontent.com` so it renders correctly in the README on GitHub and in release-notes bodies.
- **Release-publish workflow** (`.github/workflows/release.yml`). Fires on any `v*` tag push: verifies the stamped SVG matches the tag, extracts the matching `## [<version>]` section from `CHANGELOG.md`, and creates or updates the GitHub release with a body that embeds the per-tag SVG URL. Historical release pages render the version that was tagged at that moment rather than always-latest. Supports `workflow_dispatch` for manual republish.
- **`scripts/stamp-version.mjs`** reads `packages/core/package.json` and stamps every `docs/public/*.svg.template` into its sibling `.svg` with the current version. `--check` flag is the CI drift guard. Wired into `predocs:build` so the docs site always carries a fresh stamp.
- **Self-contained `og-image.svg`.** Embeds the favicon vector inline so the SVG renders correctly when uploaded as the GitHub social preview or fetched by link-unfurl bots that don't co-locate adjacent assets.

## [0.4.1] - 2026-05-18

### Fixed

- **Peer-dependency ranges in plugin packages** updated to `^0.4.0` so workspace resolution links `@studnicky/iridis` correctly under `npm ci`. The 0.4.0 release shipped with plugins declaring `^0.3.0`, which made `npm ci` fall through to the public npm registry (where the package is unpublished) and 404. CI build for the docs site failed as a result; this release fixes the workspace-internal linking.

## [0.4.0] - 2026-05-18

Schema-first engine foundation, flat slot grammar, and full test refactor. Breaking on plugin slot names and the `PluginOutputsRegistry` / `PluginMetadataRegistry` module-augmentation pattern.

### Breaking

- **Flat colon-namespaced slot grammar.** `state.outputs` and `state.metadata` use a single top-level key per slot, namespaced by plugin (`capacitor:statusBar`, `vscode:themeJson`, `stylesheet:cssVars`, `rdf:reasoningGraph`, `gallery:histogram`, `contrast:aa`, `core:json`, etc.). The previous namespace-object pattern (`state.outputs['capacitor'].statusBar`) is gone. User configs map slot keys to filenames 1:1 in `output.files`.
- **`declare module '@studnicky/iridis'` augmentation pattern deleted.** Plugins now expose `schemas(): { outputs?: Record<string, JSONSchema>, metadata?: Record<string, JSONSchema> }` on `PluginInterface` to declare their slot shapes. The engine validates `state.outputs[slot]` and `state.metadata[slot]` against the contributing plugin's schema at run exit.
- **Typed intakes throw on non-conforming input.** `intake:hex`, `intake:rgb`, `intake:hsl`, `intake:oklch`, `intake:lab`, `intake:p3`, `intake:named`, `intake:imagePixels` reject malformed input with a descriptive error. `intake:any` keeps polymorphic dispatch — iterates delegates, first non-null parse wins, throws only if no delegate matches.

### Added

- **ajv-backed validator** with per-engine compile cache. Replaces the hand-rolled draft-07 walker. `Validator` is now a thin wrapper around ajv.
- **`json-schema-to-ts`** derives TS interfaces from `as const` schema literals via `FromSchema`. JSON Schema is the source of truth for every boundary type.
- **`TaskManifestSchema`** validates every adopted task's manifest at `Engine.adopt`, again at `Engine.pipeline`, and at `Engine.run` entry. Defense in depth.
- **Upstream `output.files` validation** at `Cli.run`: rejects configs that declare a slot no pipeline task writes. The error names the missing slot and lists the slots that ARE produced.
- **Bundle aggregator pattern** (opt-in): plugins may ship an `emit:<plugin>Bundle` task that reads sibling slots and writes one combined slot for users who want one file containing the whole plugin namespace.
- **Scenario-matrix test suites** across all 9 packages. Cells, coordinate-tagged assertion messages, happy/edge/unhappy scenarios per subject. ~700 scenarios workspace-wide.

### Fixed

- **VSCode P3 leak.** `EnsureContrast.apply` now preserves the source gamut. sRGB-sourced foregrounds (hex inputs) round-trip through contrast adjustment as sRGB instead of being re-stamped as `displayP3`. VSCode theme slots like `gitDecoration.addedResourceForeground` emit `#rrggbb` hex for sRGB inputs instead of `color(display-p3 …)`.

### Removed

- **Dead `requires` runtime guards** in vscode tasks (`ApplyModifiers`, `EmitVscodeSemanticRules`, `EmitVscodeThemeJson`). `Engine.pipeline` validates these declarations at build time; the runtime throws were unreachable.
- **`PluginOutputsRegistry` / `PluginMetadataRegistry`** TypeScript registry interfaces. Plugin output and metadata shapes now flow through schemas, not module augmentation.

### Dependencies

- `@studnicky/iridis` (core) adds runtime deps: `ajv@^8.20.0`, `json-schema-to-ts@^3.1.1`. The "zero runtime dependencies" claim is gone.

## [0.3.6] - 2026-05-17

Docs site refactor. Eliminates the entire import-map fragility class.

### Removed

- **CDN externalisation of Vue, PrimeVue, `@primeuix/themes`, and mermaid.** The site used to load these from `esm.sh` at runtime via an import-map declared in `<head>`; that approach forced a fragile head-ordering dance (see v0.3.4 / v0.3.5) because VitePress 1.x emits its own `<script type="module">` and modulepreload links BEFORE any `head` config entry, and Vite's own `transformIndexHtml` does not fire on VitePress's SSG output. None of the other VitePress sites in this workspace use the CDN pattern. Trading the small bundle-size saving for HTML-spec compliance, predictable production behaviour, no cross-origin handshake to `esm.sh`, no corporate-firewall failures, and no future-VitePress-upgrade breakage.
- `CDN_VERSIONS`, `CDN_PRIMEVUE_SUBPATHS`, `CDN_EXTERNAL_PATTERNS`, `IS_BUILD`, `buildImportMap`, `vite.build.rollupOptions.external`, and the `transformHtml` hook are all removed from `docs/.vitepress/config.ts`.

### Changed

- **VitePress 1.5.0 → 1.6.4** (current stable, was already in the lockfile via `^1.5.0`; range explicit now).
- **Vue 3.5.0 → 3.5.34** (current stable).
- **mermaid 11.14.0 → 11.15.0** (current stable).

## [0.3.5] - 2026-05-17

Cleanup of v0.3.4.

### Changed

- **Import map injection is now declarative.** Replaces the v0.3.4 regex-based move-after-emit hack with a direct `transformHtml` insertion at the top of `<head>` (`String.replace('<head>', ...)`). VitePress 1.x has no position-controlled head-injection API, and Vite's own `transformIndexHtml` hook does NOT fire on VitePress's SSG-rendered output, so `transformHtml` remains the source-of-truth hook. `buildImportMap` now returns a typed `Record<string, string>` instead of pre-stringified JSON; the `transformHtml` hook wraps it in the `<script type="importmap">` tag at insertion time.
- **Engine logger silenced on the docs site.** `consoleLogger.level = 'error'` set at theme boot in `docs/.vitepress/theme/index.ts`. The engine's CVD-advisory and missing-role warnings fire on every projector run (hundreds per session as the user edits the palette) and aren't actionable from inside the docs. Library consumers configure their own level; this only affects the docs site.

## [0.3.4] - 2026-05-17

Hotfix.

### Fixed

- **Production import map ordering.** VitePress emits its `<script type="module" src="app.js">` and modulepreload links into `<head>` BEFORE the entries declared in the `head` config. Per the HTML spec, an import map MUST appear before any module script or modulepreload anchor; otherwise the browser parses it too late and silently ignores it. Without the fix the live site rendered the SSR shell but failed to mount `BuildPanel` and PrimeVue, because every bare specifier (`vue`, `primevue/*`, `@primeuix/themes`) resolved to a relative path like `/iridis/vue` and 404'd. A new `transformHtml` hook in `docs/.vitepress/config.ts` pulls the import map out of its emitted position and reinserts it immediately before the first module-script or modulepreload anchor. Verified in built dist: import map now on line 12, app script on line 13.

## [0.3.3] - 2026-05-17

Docs minor with one breaking URL change.

### Added

- **PrimeVue Accordion in the reference panels.** `BuildImageOptionsGuide`, `BuildEngineKnobsGuide`, and `BuildRoleSchemaGuide` now render one accordion panel per knob instead of a flat list. Single-select (default); the leg label sits on the left, the toggle indicator on the right, full row is the click target. Initial state opens the first panel so first paint is never blank.

### Changed

- **Home page consolidates the project pitch + builder.** `AuroraHero` sits above the `BuildPanel`; the prose (what you get, when to install, where to look next) sits below. One scrollable surface instead of two cross-linked pages.
- **`BuildPanel` header replaced by a connected tab bar.** The page title and subtitle are gone; the tabs themselves now act as the panel header with the `Reset to defaults` button sitting in the same row at the right. CSS gives the tab bar and the panel body shared borders and rounded corners so they read as one card.
- **Project-wide copy scrub.** Every em-dash (`—`) in human-readable surfaces (markdown docs, Vue components, TypeScript JSDoc, CSS comments, CHANGELOG, README, llms.txt, manifest, package.json description fields, RSS feed template, SEO meta-tag templates) replaced with context-appropriate punctuation. `ConsoleLogger`'s ` — ` field separator swapped for ` | ` with the golden test fixtures updated in lockstep. AI-isms (3 hits across the project: `seamlessly`, `elevated`, and one in the VSCode plugin) rewritten or cut. En-dashes in numeric ranges and proper-name citations preserved.

### Removed

- **BREAKING: `/about` and `/build` routes deleted.** Both URLs return 404 now. The content lives on the home page (`/`). Links in the sidebar, the navbar builder toggle, the `try-it-out` page, the `image-to-theme` page, and the SEO sitemap have all been updated to point at `/`.

## [0.3.2] - 2026-05-17

Docs minor.

### Added

- **`BuildImageOptionsGuide.vue`**: reference panel paired with the Image-tab sliders. One block per extractor knob (algorithm, palette size, histogram bpc, ΔE input cap, harmonize, lightness range, chroma range) with short summary + long explanation + hover-detail. Same shape as `BuildRoleSchemaGuide`.
- **`BuildEngineKnobsGuide.vue`**: reference panel paired with the Configuration-tab knob grid. One block per engine knob (framing, color space, algorithm, contrast level, envelope mode, role schema) with the same structure.
- **Famous-photo preset library.** Six public-domain photos hosted on `upload.wikimedia.org`: *Great Wave* (Hokusai, c. 1831), *Starry Night* (Van Gogh, 1889), *Earthrise* (Apollo 8, 1968), *Blue Marble* (Apollo 17, 1972), *Pillars of Creation* (Hubble, 2014), *Carina Nebula* (JWST, 2022). The iridis logo stays as the project reference.
- **Mount-time preset availability probe.** Every preset URL is loaded via an `Image()` element with `onload`/`onerror` and an 8s timeout; unreachable URLs are filtered from the chip row and logged via `console.warn` so misconfiguration surfaces in dev-tools without breaking the page.

### Changed

- **Image-tab right column layout.** Histogram on top spans the column; below, a sub-grid pairs a small `BuildImageOptionsGuide` with the controls stack (algorithm `SelectButton` + slider channels). Each slider carries a `title` tooltip matching the guide's inline explanation.
- **Configuration-tab layout.** Mirrors the Role-schema tab: `BuildEngineKnobsGuide` on the left, knob grid on the right, stacking single-column below 920px.

## [0.3.1] - 2026-05-17

Patch.

### Fixed

- **`ImageToTheme.vue` source-mode picker placement.** The source-mode SelectButton (File / URL / Preset) and its input row sit on the LEFT column under the image drop zone, mirroring `IridisPicker`'s mode-tabs slot. Right column owns output configuration only: histogram, algorithm SelectButton, sliders.

## [0.3.0] - 2026-05-16

Pre-alpha. Image clustering primitives, consolidated `/build` workspace, unified SEO/structured-data template.

### Added

- **`gallery:histogram` task** (`@studnicky/iridis-image`). 5-bits-per-channel weighted histogram over `state.colors`; emits one record per non-empty bin with `hints.weight` set to the pixel count. Pair upstream with `intake:imagePixels` and downstream with `gallery:extract`.
- **`clusterMedianCutWeighted` math primitive** (`@studnicky/iridis`). Generalises `clusterMedianCut` to respect per-record `hints.weight`; bucket splits partition by cumulative weight (not count), so a heavily-weighted color survives reduction even when surrounded by low-weight neighbours. Selection score is `weight × widest_range` (minimum-within-cluster-error heuristic).
- **`clusterDeltaEMerge` math primitive** (`@studnicky/iridis`). Agglomerative ΔE2000 clustering. Each input record starts as its own cluster; merges the closest pair until exactly K remain. Forward-progress guard handles all-NaN distance pathology. Output `hints.weight` is the merged cluster's total.
- **`gallery:extract` algorithm dispatch** (`@studnicky/iridis-image`). New `metadata.gallery.algorithm` slot selects `'median-cut'` (default; dispatches to `clusterMedianCutWeighted` when any input carries a weight, else `clusterMedianCut` for plain palettes) or `'delta-e'` (pre-trims by descending weight to bound the agglomerative reducer's input).
- **`/build` workspace consolidation.** Five-tab workbench at `/iridis/build` (User palette / Image / Role schema / Configuration / Code) sharing one `configStore` so every tab edits the same SPA-wide theme. `BuildResolvedRoles` grid renders below the tabs as the canonical live read-out.
- **Standalone live-demo pages.** `/iridis/try-it-out` and `/iridis/image-to-theme` render the seed-picker and image-extraction workflows respectively, each followed by the shared resolved-roles grid. Both add to the sidebar.
- **Unified SEO + structured-data template** (`docs/.vitepress/config.ts`). `BreadcrumbList` JSON-LD on every page, `Organization` JSON-LD with `sameAs` to GitHub + npm + author, `HowTo` JSON-LD gated to `/recipes/*`, `article:modified_time` + `article:author` when git lastUpdated resolves. `preconnect` + `dns-prefetch` to `esm.sh` for LCP improvement. `hreflang` en-US + x-default. Bingbot directive. Referrer policy `origin-when-cross-origin`.
- **PWA manifest** (`docs/public/manifest.webmanifest`). Icons, screenshots, theme color, scope, start_url.
- **RSS feed** (`docs/.vitepress/dist/feed.xml`, generated at build-end). Parses `CHANGELOG.md` versions into RSS 2.0; linked from `<head>` via `rel=alternate type=application/rss+xml`.
- **`llms.txt`** (`docs/public/llms.txt`). Markdown index of canonical URLs per llmstxt.org standard, for LLM crawlers (ChatGPT, Perplexity, Claude).
- **Per-page `description:` frontmatter.** Every route under `/concepts`, `/recipes`, `/reference`, plus the top-level pages, ships a unique 110-160 char declarative description; SERP previews and unfurl cards no longer share the site-level fallback.
- **`iridis.seo` config in `package.json`.** Single namespace for Google Search Console + Bing Webmaster Tools verification tokens and the X/Twitter handle. All three are explicitly-public markers, not credentials. Empty string suppresses the corresponding tag.
- **Reactive `appliedRoles` projection** (`docs/.vitepress/theme/stores/applyConfigToDocument.ts`). The projector publishes the role → hex map atomically on every successful `engine.run`, so downstream consumers (code-snippet panel, role cards) subscribe via Vue reactivity instead of polling `document.documentElement.style`.
- **Docs hero + atmosphere components.** `AuroraHero`, `ColorOrgan`, `IridisCursorBlob`, `IridisSwatchTape`, `PaletteCTA`: decorative components composed by `about.md` and the global layout slots. All respect `prefers-reduced-motion`.
- **Reference: role-schema field pages.** `/iridis/reference/role-schema/{name, intent, lightness-range, chroma-range, derived-from, hue-lock, required, contrast-pairs}`: one page per schema field with shape, semantics, and examples.

### Changed

- **`/build` is the new docs home.** `docs/index.md` renders `<BuildPanel />`; the legacy two-panel layout is consolidated into the tabbed workspace.
- **Builder defaults strict-by-default.** `contrastLevel: 'AAA'`, `contrastAlgorithm: 'apca'` in both the JSON Schema spec and the runtime `docsConfigDefaults`. First-visit users get the most rigorous accessibility audit the engine can run.
- **Plugin peer-dep ranges bump to `^0.3.0`.** Every first-party plugin (`@studnicky/iridis-{capacitor,cli,contrast,image,rdf,stylesheet,tailwind,vscode}`) declares `@studnicky/iridis: ^0.3.0` as its peer dependency.
- **`hasAnyWeight` predicate semantics** (`gallery:extract` dispatcher). Presence of `hints.weight` is the signal; the previous predicate excluded `weight === 1` and silently fell back to `clusterMedianCut`, losing the weight bookkeeping a histogram with uniform-weight bins had set up.

### Fixed

- **`<title>` tag duplication on home + about.** Home page (`title: iridis`) used to render as `iridis | iridis` because `titleTemplate: ':title | iridis'` appended unconditionally; about page (`title: About iridis`) used to render as `iridis | iridis` because VitePress derived the title from the `<h1>iridis</h1>` inside `<AuroraHero>` over the frontmatter. `transformPageData` now forces `pageData.title` from frontmatter and sets `pageData.titleTemplate = false` when the page title equals the site title.
- **Empty `og:description` + `twitter:description` on every page lacking frontmatter description.** `transformPageData` used `??` to coalesce, but VitePress sets `pageData.description = ''` (empty string, not undefined) when no description is supplied, so `??` passed through. Switched to `||` with explicit frontmatter extraction.
- **`ImageToTheme.vue` duplicate source picker.** The LEFT column duplicated the source-mode `SelectButton`, file input, and `ref="fileInput"` already present in the RIGHT column: two hidden file inputs with the same template ref, two visible mode pickers. LEFT column is now drop-zone + preview only.
- **`BuildCodePanel.vue` reactivity gap.** Module-scope `void themeStore` never established a reactive dependency; the CSS-vars snippet read from `document.documentElement.style` which the async projector updates after the watch fires (race condition). Computed now reads the new reactive `appliedRoles` ref directly.
- **`ClusterDeltaEMerge` pass-through preserves wide-gamut.** When `k >= colors.length`, the pass-through used to reallocate every record via `fromOklch`, stripping `displayP3` (re-derived only when out of sRGB) and dropping non-weight hint keys. Now returns inputs verbatim when a weight is already declared; otherwise reallocates via the factory with merged hints.
- **`ClusterMedianCutWeighted` type-cast bypasses.** Three `as ColorRecordInterface` casts replaced with `for...of` guards consistent with the rest of the file.
- **Stale comments referencing the deleted `RightPanel.vue`.** Comments in `MultiOutputDemo.vue`, `SidebarResize.vue`, `theme/index.ts`, and `base/IridisCard.vue` rewritten to reflect current state.

### Removed

- **`docs/.vitepress/theme/components/RightPanel.vue`**: split into `BuildPanel` (tabbed workbench) + `BuildResolvedRoles` (shared resolved-roles grid).
- **`docs/.vitepress/theme/components/TryItOutForm.vue`**: replaced by `IridisDemo` standalone on `/try-it-out`.
- **`docs/.vitepress/theme/stores/panelState.ts`**: the consolidated `/build` workspace has no right-panel-toggle state to track.

## [0.2.0] - 2026-05-15

Pre-alpha. First wide-gamut + ontology-driven release.

### Added

- **Cross-plugin Display-P3 propagation.** Stylesheet (scoped + unscoped), Tailwind theme, VS Code theme JSON, and the RDF reasoning graph all emit P3 forms when an input role carries populated `displayP3`. Capacitor stays sRGB per its native OS surface limits.
- **`intake:p3` task.** Parses CSS `color(display-p3 r g b [/alpha])` strings. `intake:any` dispatches P3 strings to it automatically. `SourceFormatType` extends with `'displayP3'`.
- **OKLCH gamut handling in `ColorRecordFactory.fromOklch`.** Detects out-of-sRGB input via the new `GamutMapSrgb` primitive (CSS Color 4 §13.2.2 binary-search chroma reduction); populates `displayP3` from the unclipped original; populates `rgb` from the gamut-mapped value so sRGB consumers stay safe.
- **`OklchToDisplayP3` math primitive.** Class + singleton, cites Björn Ottosson OKLab + CSS Color 4 §17.6.
- **`@supports`-wrapped P3 cascade in `EmitCssVars` + `EmitCssVarsScoped`.** Emitted CSS orders blocks `:root` → `@media (prefers-color-scheme: dark)` → `@supports (color: color(display-p3 0 0 0))` → `@media (forced-colors: active)`.
- **Research-grounded CVD compliance.** `EnforceCvdSimulate` evaluates every pair against all four canonical CVD types (deuteranopia, protanopia, tritanopia, achromatopsia). Per-type thresholds in `cvdThresholds.ts` cite BVM97, MOF09, VBM99, CIE76, SWD05, WCAG21, WS82. Bipartite signal: warning fires on either `|drop|` exceeding `dropMagnitude` OR `simulatedContrast` falling below the WCAG 1.4.11 floor. Output preserves shape; adds `dropThreshold` + `minSimulatedContrast` for auditability.
- **Structured logger.** `ConsoleLogger` channels accept `(scope, op, message, context?: Record<string, unknown>)`. The logger formats; callers never interpolate. Level evaluated first so suppressed calls return before any context object is touched. New `trace` channel. Order: `silent < error < warn < info < debug < trace`.
- **Ontology-driven role intent.** `ResolveRoles` propagates `RoleDefinitionInterface.intent` onto resolved `ColorRecordInterface.hints`. `EmitCssVars.forcedColorsToken` switches on `hints.intent`; no substring inference on role names. APCA `requiredLc`, WCAG required ratio, and Capacitor StatusBar style all read the same intent slot. `RoleSchemaEditor`'s intent picker exposes the canonical 10-value `ColorIntentType` union.
- **Canonical `ColorIntentType` union.** Ten values: `text | background | accent | muted | critical | positive | link | button | onAccent | onButton`.
- **Reusable docs components.** `RoleCard`, `PairCard`, `ResolvedRoleCard`, `PaletteSwatch`, `PaletteEditor`, `FormField`, `ExportBar`. All form fields surface native `title` tooltips explaining their purpose.
- **`xState`-style dispatcher actions.** `editRoleSchema` action publishes user-edited schemas as `custom-<timestamp>` entries in `roleSchemaByName`. Components dispatch typed actions; the dispatcher owns the registry shape.
- **CDN externalisation for docs heavy deps.** Vue, PrimeVue (14 subpaths), `@primeuix/themes`, and mermaid load from esm.sh via a `<head>` import map. Theme chunk 582 → 175 KB. Vitepress build emits zero warnings.
- **Plugin type re-exports.** Every plugin re-exports its `augmentation.ts` slot interfaces via `src/types/index.ts`; every plugin's `package.json` exposes `./types` in its exports map.
- **Math primitive consistency.** `oklchToRgbRaw`, `clamp01`, `clamp` promoted from free functions to class + singleton (`OklchToRgbRaw`, `Clamp01`, `Clamp`) matching the project's `<Name> { apply(...) }` pattern.
- **Test coverage extended to 220 scenario-runner tests.** Wide-gamut, CVD compliance, intake-any dispatcher, golden fixtures (`quickPalette`, `emit-cssVars`, `reason-serialize`), structured-logger zero-work-at-suppressed-levels, role-intent propagation, plus the original critical-path coverage.

### Changed

- **`ColorIntentType` union trimmed to 10 canonical values.** Legacy values `base`, `surface`, `neutral` removed; consumer schemas migrated (`base`/`surface` → `background`, `neutral` → `muted`).
- **`ColorRecordInterface.displayP3` semantics.** Populates only when the input OKLCH lies outside sRGB-gamut OR the record arrived via `intake:p3`; stays `undefined` for sRGB-representable inputs. `ColorRecordInterface.rgb` is always sRGB-safe (gamut-mapped from OKLCH when needed).
- **`ColorRecordInterface` shape is monomorphic.** Every allocation produces the same V8 hidden class. `displayP3` + `hints` slots are required `T | undefined`, written explicitly by the factory.
- **`Engine` caches resolved task sequence on `pipeline()`.** Invalidated on `adopt()`.
- **`ConsoleLogger` is a module singleton.** `Engine.run` no longer allocates a fresh logger per call.
- **`EnsureContrast` mutates an OKLCH `L` scalar.** Single `ColorRecord` allocation at return (was up to 50 per failing pair).
- **`MultiOutputDemo.vue` plugin imports are dynamic.** Theme chunk drops 207 KB; lazy chunks load on mount.
- **`iridis-8` dark mode `on-brand` lightness range.** Flipped from `[0.96, 1.00]` (white) to `[0.04, 0.14]` (dark) so the brand pair always reaches 4.5:1. Light mode unchanged.

### Fixed

- **Workspace `tsc` gate.** Root `tsconfig.json` was previously bypassed by `tsc --noEmit`; `tsc --build` now drives every package reference.
- **`Engine.adopt` plugin shape validation.** Hand-rolled JSON Schema walker at `core/src/model/Validator.ts` validates `PluginInterface` at adoption. Duplicate plugin `name` adoption warns.
- **`Engine.pipeline` enforces `manifest.requires`.** A task that requires another task must appear after it; declared-out-of-order throws.
- **`state.graph` relocated to RDF plugin namespace.** Canonical `PaletteStateInterface` no longer carries a graph slot; RDF reads/writes `state.outputs.reasoning.graph` via plugin augmentation.
- **`MathPrimitiveInterface` + `ColorMathRegistry` removed.** Plugins import singletons directly; engine no longer carries a math registry.
- **`SrgbToDisplayP3` + `DisplayP3ToSrgb` deleted.** Zero internal consumers; replaced by `OklchToDisplayP3` + the inverse chain inside `IntakeP3`.
- **`RoleSchemaEditor` no longer mutates the registry directly.** Edits dispatch through `editRoleSchema`; the dispatcher owns the `{ dark, light }` pair shape so downstream consumers see a complete entry.
- **Right panel widens to 50 % of the viewport** (was capped at 720 px).
- **Vitepress logo path resolution.** Asset paths switched `/iridis/logo.png` → `/logo.png` so VitePress applies the base prefix at build time.

### Removed

- **Legacy `ColorIntentType` values:** `base`, `surface`, `neutral`.
- **`base/IridisInput.vue` + `base/IridisSelect.vue`**: dead wrappers, never consumed.
- **`SrgbToDisplayP3` + `DisplayP3ToSrgb` math primitives**: superseded by `OklchToDisplayP3` + `IntakeP3`.
- **Substring-based forced-colors token inference.** Ontology is the contract.

## [0.1.0] - prior pre-alpha state

### Added

- `@studnicky/iridis` engine package: composition spine (`Engine`, `TaskRegistry`), canonical models (`ColorRecord`, `PaletteState`, `RoleSchema`, `RuntimeOptions`), and zero runtime dependencies.
- Twenty-five direct-import math primitives covering OKLCH, HSL, sRGB, and Display-P3 colour-space operations; WCAG 2.1 and APCA contrast models; Brettel-Viénot CVD simulation; median-cut clustering; and contrast-preserving lightness adjustment. Each primitive is a class with an `apply` method, exported as a singleton (`luminance`, `contrastWcag21`, `oklchToRgb`, etc.) so callers import only what they need.
- Canonical pipeline tasks: format-agnostic color intake (`intake:hex/rgb/hsl/oklch/lab/named/imagePixels/any`), clamp (`clamp:count`, `clamp:oklch`), role resolution (`resolve:roles`), parametric family expansion (`expand:family`), contrast enforcement (`enforce:contrast`), light/dark variant derivation (`derive:variant`), and JSON state emission (`emit:json`).
- Typed runtime toggle surface: `RuntimeOptionsInterface` with `framing` (`dark` | `light`), `colorSpace` (`srgb` | `displayP3`), and `extra` plugin bag. `input.runtime` flows to `state.runtime` for cross-output consumption by every emitter plugin.
- Public API exports: `@studnicky/iridis` re-exports model, registry, engine, math, and tasks modules; subpath exports for `./model`, `./registry`, `./engine`, `./math`, `./tasks`, `./types`.
- Test coverage: 220+ tests across Engine, TaskRegistry, math primitives, pipeline composition, and per-plugin scenario suites.
- First-party output plugins published independently: `-cli`, `-vscode`, `-stylesheet`, `-tailwind`, `-image`, `-contrast`, `-capacitor`, `-rdf`. Each adopts the engine via `engine.adopt(plugin)` and contributes its own `emit:*` task. Engine runs without any of them.
- VitePress documentation site scaffold with iridescent brand palette and Markdown syntax highlighting for gradient keywords.
- VitePress build aligned with reference design family (ripper, squashage, json-tology): shared `base.css` for typography, code, table, sidebar, and blockquote rules; project-specific gradients consolidated in `palette.css`; sidebar wired with Introduction / Concepts / Recipes / Reference sections; internal docs (`internal/**`) excluded from public build; `editLink` points at the active `develop` branch.
- Docs site dogfoods iridis: a sidebar accordion exposes a JSON-Schema-driven config form (seed colors, framing, contrast level/algorithm, color space, role schema). The user's settings drive every live demo on the site AND the docs theme itself, the engine emits CSS custom properties onto `document.documentElement` so the brand and surface tokens are recomputed from the user's seeds.
- Live demos on every example page (`<IridisDemo>` Vue component) embed a real `Engine` instance bound to the global config store, render canonical colors, resolved roles, and collapsible `state.outputs` JSON. Each demo ships with a paired `<IridisCode>` collapsible block showing the actual code that drives it.
- Settings persist across pages via localStorage (key: `iridis-docs-config`). SSR-safe; storage access guarded by `typeof window` checks so the static build never trips.
- Required-role enforcement: `resolve:roles` now guarantees that every required role is populated AND that its assigned color satisfies the role's declared `lightnessRange`, `chromaRange`, and `hueOffset` constraints. The closest candidate is nudged in OKLCH space, lightness and chroma clamped into range, hue driven to the `hueOffset` target if declared. When no input colors are present, required roles are synthesized from the constraint centers. Optional roles with declared constraints are likewise nudged when assigned. `metadata.rolesSynthesized` records any role populated from constraints alone.
- Inline color pickers on every `<IridisDemo>`: each example now shows its own seed-color row with native `<input type="color">` per seed, an `× remove` per row, and a `+ add color` button (constrained to the schema's 1-8). All pickers, sidebar accordion AND every demo on the page, edit the same `configStore.seedColors` array, so any picker change recomputes every demo on the page AND the docs theme. `+ add color` immediately opens the native color dialog for the new slot via `HTMLInputElement.showPicker()`.
- Docs theme is now itself an iridis palette. `applyConfigToDocument` runs the engine against a docs-theme role schema (`docsThemeSchema.ts`) with framing-specific OKLCH constraints, separate `dark` and `light` envelopes for `background`, `surface`, `bgSoft`, `divider`, `muted`, `text`, `brand`, `onBrand`. The engine's required-role nudging guarantees every chrome token falls inside its declared range regardless of seed input. Pattern adapted from `vscode-arcade-blaster/dev/themes/tools/paletteClamp.ts`.
- Cascading docs theme tokens: the engine emits eight canonical `--iridis-*` properties; vitepress's `--vp-c-*` chrome tokens cascade from them via `var()` references in `palette.css`, and hover/elevation states are computed via `color-mix()`. One seed change → one engine recompute → every cascade follower updates in one paint.
- `quickPalette(seeds, framing?)` one-liner exported from `@studnicky/iridis`. Returns a four-role hex palette (`background`, `foreground`, `accent`, `muted`) using framing-aware default clamp ranges. The simplest possible iridis call. 4 new tests cover dark/light direction, single-seed, and hex format.
- New top-level concept page `concepts/accessibility-calculations.md`: WCAG 2.1 + APCA tier tables, `contrastPairs` declaration semantics, the `enforce:contrast` nudge loop, CVD simulation overview, and the "declare instead of validate" stance. Wired into the sidebar.
- Logo background stripped via `magick -fuzz 12% -transparent black`. The icon's pure-black corners are now true alpha-zero; on the dark sidebar it blends without a visible square frame.
- Redesigned `<IridisDemo>` as split-column + tabs: seeds row left, OKLCH-aware picker right, three tabs at the bottom (Resolved roles / Role schema / Code). Both the Role schema textarea and the colors block in the Code tab are inline-editable and validated against canonical schemas, invalid edits do not propagate, valid edits update `configStore` immediately and the engine re-runs.
- Multi-output demo (six output formats from one engine instance: cssVars, cssScoped, tailwindTheme, capacitorTheme, RDF Turtle, JSON) shipped as `<MultiOutputDemo>`. VS Code emit is intentionally omitted from the docs demo pending a fix to the plugin's `luminance(hex)` invocation.
- New `Try it out` page consolidates the configuration form alongside one demo running the full pipeline. Wired into the sidebar right after `Getting started`. Replaces the prior sidebar-mounted accordion.
- Vitepress dark/light toggle in the navbar is now bidirectionally bound to `configStore.framing` via a MutationObserver on `html.dark` and a watcher on the framing field. Flipping the theme toggles iridis's clamp envelopes for every chrome and syntax token in one paint.
- Cascading syntax-highlight tokens: 14 new syntax roles in `docsThemeSchema` (`syntaxText`, `syntaxKeyword`, `syntaxString`, `syntaxFunction`, `syntaxType`, `syntaxConstant`, `syntaxComment`, `syntaxNumber`, `syntaxEscape`, `syntaxProperty`, `syntaxTag`, `syntaxPunctuation`, `syntaxVariable`, `syntaxError`) emitted as `--iridis-syntax-*` CSS custom properties. A custom Shiki theme (`shikiTheme.ts`) hardcodes those `var()` references so code blocks recolor in step with the chrome.
- `getOrCreateOutput<T>(state, key)` helper hoisted to core (`@studnicky/iridis/model`). Replaces the duplicated 5-line "fetch-or-init the named output slot" pattern that had accumulated across vscode plugin emit tasks.
- `EmitVscodeUiPalette` defect fixed: the task was calling the luminance primitive with a hex string, but `Luminance.apply` requires a `ColorRecordInterface` and threw at runtime. The task now resolves the role to its `ColorRecord` and calls `luminance.apply(record)` directly. The framing-detection codepath is functional again.
- Architecture review + cleanup pass landed: `outstanding.md` rewritten to reflect verified-shipped state (engine ready for publish, docs site live and dogfooding the engine) vs. queued plugin work.
- Two-panel layout: collapsible left sidebar (nav + Configuration accordion + On this page accordion) + collapsible right panel (persistent example builder running the canonical full pipeline). Vitepress's right-rail outline disabled; `<SidebarToc>` walks the live DOM (`.vp-doc h2/h3`) and re-binds on route change. `<RightPanel>` mounts via the `aside-top` slot.
- Example mechanism unified, every page now shares the same `<IridisDemo>` instance via the right panel; per-page `<IridisDemo>` embeds removed (they were duplicating the panel's output and on `concepts/pipeline.md` showed three near-identical demos).
- Pulsing concentric-rings logo treatment (uiverse loader pattern) replaces the static rounded-square. Five backdrop-filter-blurred rings with brand-color borders ripple at 5s ease-in-out around the iridescent eye, which gets a violet drop-shadow.
- Depth + edges + glass treatment: tokenized `--iridis-shadow-{sm,md,lg}` and `--iridis-edge-soft`; gradient surfaces on code blocks, custom blocks, blockquotes, VPFeature; `color-mix(in oklch, ...)` everywhere instead of hardcoded rgba; `backdrop-filter: blur` on translucent panels.
- Unified drawer layout across every viewport: docs content is the full middle column at every width; the Pages tree and the Try iridis builder are fixed-position overlay drawers driven by the navbar `PAGES` and `TRY IRIDIS` buttons. Drawer dimensions adapt with viewport (Pages: `min(85vw, 320px)`; Builder: `min(85vw, 480px)` right-edge drawer on desktop, full-width bottom sheet on mobile). Defaults differ by viewport: desktop (`>=1100px`) opens both drawers on first paint; mobile (`<1099px`) starts both closed. A single universal backdrop (`MobileOverlay`) dims content whenever any drawer is open and dismisses on tap. Sticky vertical tab affordances retired.

### Roadmap

- v0.2: Living-color animation engine (`@studnicky/iridis-anima`), reactive signal bindings (`-pulse`), palette state machine (`-fsm`), curated animation trajectories (`-trajectory`), palette algebra (`-algebra`). See [docs/v2-living-color.md](docs/v2-living-color.md).

[Unreleased]: https://github.com/Studnicky/iridis/compare/v0.0.0...HEAD

[0.8.0]: https://github.com/Studnicky/iridis/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/Studnicky/iridis/compare/v0.1.1...v0.7.1
[0.6.1]: https://github.com/Studnicky/iridis/compare/v0.6.0...v0.6.1
