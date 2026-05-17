# Changelog

All notable changes to iridis are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-05-17

Docs minor.

### Added

- **`BuildImageOptionsGuide.vue`** — reference panel paired with the Image-tab sliders. One block per extractor knob (algorithm, palette size, histogram bpc, ΔE input cap, harmonize, lightness range, chroma range) with short summary + long explanation + hover-detail. Same shape as `BuildRoleSchemaGuide`.
- **`BuildEngineKnobsGuide.vue`** — reference panel paired with the Configuration-tab knob grid. One block per engine knob (framing, color space, algorithm, contrast level, envelope mode, role schema) with the same structure.
- **Famous-photo preset library.** Six public-domain photos hosted on `upload.wikimedia.org`: *Great Wave* (Hokusai, c. 1831), *Starry Night* (Van Gogh, 1889), *Earthrise* (Apollo 8, 1968), *Blue Marble* (Apollo 17, 1972), *Pillars of Creation* (Hubble, 2014), *Carina Nebula* (JWST, 2022). The iridis logo stays as the project reference.
- **Mount-time preset availability probe.** Every preset URL is loaded via an `Image()` element with `onload`/`onerror` and an 8s timeout; unreachable URLs are filtered from the chip row and logged via `console.warn` so misconfiguration surfaces in dev-tools without breaking the page.

### Changed

- **Image-tab right column layout.** Histogram on top spans the column; below, a sub-grid pairs a small `BuildImageOptionsGuide` with the controls stack (algorithm `SelectButton` + slider channels). Each slider carries a `title` tooltip matching the guide's inline explanation.
- **Configuration-tab layout.** Mirrors the Role-schema tab: `BuildEngineKnobsGuide` on the left, knob grid on the right, stacking single-column below 920px.

## [0.3.1] - 2026-05-17

Patch.

### Fixed

- **`ImageToTheme.vue` source-mode picker placement.** The source-mode SelectButton (File / URL / Preset) and its input row sit on the LEFT column under the image drop zone, mirroring `IridisPicker`'s mode-tabs slot. Right column owns output configuration only — histogram, algorithm SelectButton, sliders.

## [0.3.0] - 2026-05-16

Pre-alpha. Image clustering primitives, consolidated `/build` workspace, unified SEO/structured-data template.

### Added

- **`gallery:histogram` task** (`@studnicky/iridis-image`). 5-bits-per-channel weighted histogram over `state.colors`; emits one record per non-empty bin with `hints.weight` set to the pixel count. Pair upstream with `intake:imagePixels` and downstream with `gallery:extract`.
- **`clusterMedianCutWeighted` math primitive** (`@studnicky/iridis`). Generalises `clusterMedianCut` to respect per-record `hints.weight`; bucket splits partition by cumulative weight (not count), so a heavily-weighted color survives reduction even when surrounded by low-weight neighbours. Selection score is `weight × widest_range` (minimum-within-cluster-error heuristic).
- **`clusterDeltaEMerge` math primitive** (`@studnicky/iridis`). Agglomerative ΔE2000 clustering. Each input record starts as its own cluster; merges the closest pair until exactly K remain. Forward-progress guard handles all-NaN distance pathology. Output `hints.weight` is the merged cluster's total.
- **`gallery:extract` algorithm dispatch** (`@studnicky/iridis-image`). New `metadata.gallery.algorithm` slot selects `'median-cut'` (default — dispatches to `clusterMedianCutWeighted` when any input carries a weight, else `clusterMedianCut` for plain palettes) or `'delta-e'` (pre-trims by descending weight to bound the agglomerative reducer's input).
- **`/build` workspace consolidation.** Five-tab workbench at `/iridis/build` — User palette / Image / Role schema / Configuration / Code — sharing one `configStore` so every tab edits the same SPA-wide theme. `BuildResolvedRoles` grid renders below the tabs as the canonical live read-out.
- **Standalone live-demo pages.** `/iridis/try-it-out` and `/iridis/image-to-theme` render the seed-picker and image-extraction workflows respectively, each followed by the shared resolved-roles grid. Both add to the sidebar.
- **Unified SEO + structured-data template** (`docs/.vitepress/config.ts`). `BreadcrumbList` JSON-LD on every page, `Organization` JSON-LD with `sameAs` to GitHub + npm + author, `HowTo` JSON-LD gated to `/recipes/*`, `article:modified_time` + `article:author` when git lastUpdated resolves. `preconnect` + `dns-prefetch` to `esm.sh` for LCP improvement. `hreflang` en-US + x-default. Bingbot directive. Referrer policy `origin-when-cross-origin`.
- **PWA manifest** (`docs/public/manifest.webmanifest`). Icons, screenshots, theme color, scope, start_url.
- **RSS feed** (`docs/.vitepress/dist/feed.xml`, generated at build-end). Parses `CHANGELOG.md` versions into RSS 2.0; linked from `<head>` via `rel=alternate type=application/rss+xml`.
- **`llms.txt`** (`docs/public/llms.txt`). Markdown index of canonical URLs per llmstxt.org standard — for LLM crawlers (ChatGPT, Perplexity, Claude).
- **Per-page `description:` frontmatter.** Every route under `/concepts`, `/recipes`, `/reference`, plus the top-level pages, ships a unique 110-160 char declarative description; SERP previews and unfurl cards no longer share the site-level fallback.
- **`iridis.seo` config in `package.json`.** Single namespace for Google Search Console + Bing Webmaster Tools verification tokens and the X/Twitter handle. All three are explicitly-public markers, not credentials. Empty string suppresses the corresponding tag.
- **Reactive `appliedRoles` projection** (`docs/.vitepress/theme/stores/applyConfigToDocument.ts`). The projector publishes the role → hex map atomically on every successful `engine.run`, so downstream consumers (code-snippet panel, role cards) subscribe via Vue reactivity instead of polling `document.documentElement.style`.
- **Docs hero + atmosphere components.** `AuroraHero`, `ColorOrgan`, `IridisCursorBlob`, `IridisSwatchTape`, `PaletteCTA` — decorative components composed by `about.md` and the global layout slots. All respect `prefers-reduced-motion`.
- **Reference: role-schema field pages.** `/iridis/reference/role-schema/{name, intent, lightness-range, chroma-range, derived-from, hue-lock, required, contrast-pairs}` — one page per schema field with shape, semantics, and examples.

### Changed

- **`/build` is the new docs home.** `docs/index.md` renders `<BuildPanel />`; the legacy two-panel layout is consolidated into the tabbed workspace.
- **Builder defaults strict-by-default.** `contrastLevel: 'AAA'`, `contrastAlgorithm: 'apca'` in both the JSON Schema spec and the runtime `docsConfigDefaults`. First-visit users get the most rigorous accessibility audit the engine can run.
- **Plugin peer-dep ranges bump to `^0.3.0`.** Every first-party plugin (`@studnicky/iridis-{capacitor,cli,contrast,image,rdf,stylesheet,tailwind,vscode}`) declares `@studnicky/iridis: ^0.3.0` as its peer dependency.
- **`hasAnyWeight` predicate semantics** (`gallery:extract` dispatcher). Presence of `hints.weight` is the signal; the previous predicate excluded `weight === 1` and silently fell back to `clusterMedianCut`, losing the weight bookkeeping a histogram with uniform-weight bins had set up.

### Fixed

- **`<title>` tag duplication on home + about.** Home page (`title: iridis`) used to render as `iridis | iridis` because `titleTemplate: ':title | iridis'` appended unconditionally; about page (`title: About iridis`) used to render as `iridis | iridis` because VitePress derived the title from the `<h1>iridis</h1>` inside `<AuroraHero>` over the frontmatter. `transformPageData` now forces `pageData.title` from frontmatter and sets `pageData.titleTemplate = false` when the page title equals the site title.
- **Empty `og:description` + `twitter:description` on every page lacking frontmatter description.** `transformPageData` used `??` to coalesce, but VitePress sets `pageData.description = ''` (empty string, not undefined) when no description is supplied — `??` passed through. Switched to `||` with explicit frontmatter extraction.
- **`ImageToTheme.vue` duplicate source picker.** The LEFT column duplicated the source-mode `SelectButton`, file input, and `ref="fileInput"` already present in the RIGHT column — two hidden file inputs with the same template ref, two visible mode pickers. LEFT column is now drop-zone + preview only.
- **`BuildCodePanel.vue` reactivity gap.** Module-scope `void themeStore` never established a reactive dependency; the CSS-vars snippet read from `document.documentElement.style` which the async projector updates after the watch fires (race condition). Computed now reads the new reactive `appliedRoles` ref directly.
- **`ClusterDeltaEMerge` pass-through preserves wide-gamut.** When `k >= colors.length`, the pass-through used to reallocate every record via `fromOklch` — stripping `displayP3` (re-derived only when out of sRGB) and dropping non-weight hint keys. Now returns inputs verbatim when a weight is already declared; otherwise reallocates via the factory with merged hints.
- **`ClusterMedianCutWeighted` type-cast bypasses.** Three `as ColorRecordInterface` casts replaced with `for...of` guards consistent with the rest of the file.
- **Stale comments referencing the deleted `RightPanel.vue`.** Comments in `MultiOutputDemo.vue`, `SidebarResize.vue`, `theme/index.ts`, and `base/IridisCard.vue` rewritten to reflect current state.

### Removed

- **`docs/.vitepress/theme/components/RightPanel.vue`** — split into `BuildPanel` (tabbed workbench) + `BuildResolvedRoles` (shared resolved-roles grid).
- **`docs/.vitepress/theme/components/TryItOutForm.vue`** — replaced by `IridisDemo` standalone on `/try-it-out`.
- **`docs/.vitepress/theme/stores/panelState.ts`** — the consolidated `/build` workspace has no right-panel-toggle state to track.

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
- **Ontology-driven role intent.** `ResolveRoles` propagates `RoleDefinitionInterface.intent` onto resolved `ColorRecordInterface.hints`. `EmitCssVars.forcedColorsToken` switches on `hints.intent` — no substring inference on role names. APCA `requiredLc`, WCAG required ratio, and Capacitor StatusBar style all read the same intent slot. `RoleSchemaEditor`'s intent picker exposes the canonical 10-value `ColorIntentType` union.
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
- **`base/IridisInput.vue` + `base/IridisSelect.vue`** — dead wrappers, never consumed.
- **`SrgbToDisplayP3` + `DisplayP3ToSrgb` math primitives** — superseded by `OklchToDisplayP3` + `IntakeP3`.
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
- Logo background stripped via `magick -fuzz 12% -transparent black`. The icon's pure-black corners are now true alpha-zero; on the dark sidebar it blends seamlessly without a visible square frame.
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
- Unified drawer layout across every viewport: docs content is the full middle column at every width; the Pages tree and the Try iridis builder are fixed-position overlay drawers driven by the navbar `PAGES` and `TRY IRIDIS` buttons. Drawer dimensions adapt with viewport (Pages: `min(85vw, 320px)`; Builder: `min(85vw, 480px)` right-edge drawer on desktop, full-width bottom sheet on mobile). Defaults differ by viewport — desktop (`>=1100px`) opens both drawers on first paint; mobile (`<1099px`) starts both closed. A single universal backdrop (`MobileOverlay`) dims content whenever any drawer is open and dismisses on tap. Sticky vertical tab affordances retired.

### Roadmap

- v0.2: Living-color animation engine (`@studnicky/iridis-anima`), reactive signal bindings (`-pulse`), palette state machine (`-fsm`), curated animation trajectories (`-trajectory`), palette algebra (`-algebra`). See [docs/v2-living-color.md](docs/v2-living-color.md).

[Unreleased]: https://github.com/Studnicky/iridis/compare/v0.0.0...HEAD
