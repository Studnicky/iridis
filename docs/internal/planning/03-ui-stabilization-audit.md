# UI stabilization audit — docs site / GitHub Pages

Status: findings, ready to action. From the docs-UI survey (July 2026), verified
against `develop @ c60b800` by reading source, grepping, and one `npm run
docs:build` (succeeds, 7.35s, one bundle-size warning).

## Root cause of "busted on GitHub Pages"

**The sidebar "Pages" drawer force-opens on every page load, at every viewport,
including mobile.** `NavBarSidebarToggle.vue:49-53` unconditionally strips the
`iridis-sidebar-collapsed` class on mount; `base.css:460-466` makes the
class-absent ("open") state the default; no pre-hydration FOUC guard sets the
collapsed state. On ≤1099px, `MobileOverlay.vue:70-80` additionally paints a
full-viewport dimmed, blurred, click-to-dismiss backdrop over the content. Net
effect: a visitor arriving from search or a shared link lands on a dimmed,
drawer-obscured page every time and must manually dismiss it.

This is a **defect on `develop`**, not unlanded work. The branch triage confirmed
every mobile/picker/panel/drawer redesign branch is already merged; there is no
missing-merge fix hiding in a branch.

**Fix:** default `iridis-sidebar-collapsed` to *true* below 1100px on first mount;
auto-open only at desktop widths; persist the user's own choice in `localStorage`
(mirror the existing `themeDispatcher` persistence at
`stores/themeDispatcher.ts:247-250`).

## Findings by category

### Stability / SSR
SSR is sound — every heavy component is `<ClientOnly>`-wrapped and every
`window`/`document` access is guarded. The `base` path (`/iridis/`) is correct
for Pages. The only stability defect is the drawer force-open above.

### Performance
- **No debounce anywhere** (`grep debounce|throttle` → zero). `themeDispatcher.ts:294-301`
  deep-watches the whole config and runs an 8-stage engine pipeline (incl. 4 CVD
  simulations) synchronously on every keystroke; `BuildPanel` runs an 11-stage
  `FULL_PIPELINE` on the same watch. Typing a hex value re-runs the full
  contrast/APCA/CVD pipeline per character.
- **`ImageToTheme.vue:323-331`** re-decodes the image and re-runs full clustering
  on every slider tick (K, histogram bpc, ΔE cap, harmonize, lightness/chroma
  ranges). `runForUrl` queues rather than piles up, but dragging still stutters.
  → Fix both with a ~150–250ms debounce (`useDebounceFn` from `@vueuse/core`,
  already a transitive VitePress dep). Pairs with `@studnicky/signal` for
  cancel-in-flight (see engine-spine memo).
- **608 KB shared `app.js`** (build warns "> 500 kB"). `theme/index.ts` eagerly,
  globally registers `ImageToTheme` (987 ln), `BuildPanel`, `MultiOutputDemo`,
  `SchemaForm`, `ColorOrgan` — no `defineAsyncComponent` anywhere. Pure-prose
  reference pages pay for the whole builder/clustering UI.
  → Lazy-register the big five via `defineAsyncComponent`, or move them to
  per-page local imports on `try-it-out.md` / `image-to-theme.md` / `v2-living-color.md`.

### Visual / polish
- **Six always-mounted decorative layers on every route** (`theme/index.ts:109-116`):
  `ColorOrgan` (aurora ribbons, 90–140px blur), `IridisCursorBlob` (40px blur,
  `mix-blend-mode`), `IridisSwatchTape`, `SidebarResize`, `SidebarToc`,
  `MobileOverlay`, plus `backdrop-filter: blur(8px)` on the content column
  (`base.css:389-390`). Each is well-guarded individually; combined it's heavy
  always-on GPU compositing for a docs site.
  → Gate `ColorOrgan` + `IridisCursorBlob` to interactive pages (home, try-it-out,
  image-to-theme) or behind a "reduce visual effects" toggle.
- **Sidebar is an always-overlay drawer even at desktop** (`base.css:474`,
  `.VPContent.has-sidebar { padding-left: 0 !important; }`) — deliberate and
  documented, but a departure from the VitePress convention of a permanent left
  nav column. Reconsider alongside the drawer force-open fix.

### Dead code / stale comments
- **`ExportBar.vue`** (136 ln) — zero references anywhere. Delete, or wire into
  `BuildCodePanel` / `BuildResolvedRoles` if still intended.
- **Dangling `esm.sh` preconnect/dns-prefetch** (`config.ts:188-189`) — nothing
  loads from esm.sh since the v0.3.6 CDN removal. Delete lines 181–190 (opens a
  wasted TCP+TLS handshake per load).
- **Stale "import map is injected via the Vite plugin below" comment**
  (`config.ts:310-315`) — no such plugin exists; describes deleted machinery.
- **Stale mobile-nav comment** (`NavBarMenu.vue:23-25`) — claims mobile nav routes
  through VitePress's hamburger, but `base.css:569` force-hides it. Will mislead
  the next person who "fixes" mobile nav.

### Responsive
The shipped responsive plumbing is above average where it exists (container
queries + `matchMedia`/`MutationObserver` guards in `BuildPanel`, `ImageToTheme`,
`IridisPicker`). But nine large components carry zero `@media`/`@container` rules
of their own (`RoleSchemaEditor`, `MultiOutputDemo`, `SchemaForm`,
`BuildResolvedRoles`, `ResolvedRoleCard`, `RoleCard`, `BuildCodePanel`,
`BuildRoleSchemaGuide`, `BuildImageOptionsGuide`); they rely entirely on parent
grid breakpoints. Low urgency, but they have no defense if nested below their
min-content width (e.g. via the user-draggable `SidebarResize` handle).

### Configurability
Best-executed part of the surface. `docsConfig.schema.ts` is a single JSON-Schema
source of truth driving both the form and `engine.run()`, with `migratePersisted()`
guarding stale `localStorage` values. One gap: `applyConfigToDocument.ts:82-88`
silently `console.warn`s and no-ops if `config.roleSchema` fails to resolve —
a corrupted persisted value that slips past `migratePersisted` leaves a frozen,
stale theme. Add a user-visible fallback to a known-good schema.

## Ranked fix list

1. **Stop force-opening the drawer + overlay below 1100px** — the root cause of
   "busted on Pages." (`NavBarSidebarToggle.vue:49-53`)
2. **Debounce the config→engine projector** (~150–250ms). (`themeDispatcher.ts:294-301`,
   `ImageToTheme.vue:324-331`)
3. **Code-split the big five components** out of global registration to cut the
   608 KB bundle for prose pages. (`theme/index.ts`)
4. **Delete dangling esm.sh hints + stale import-map comment.** (`config.ts`)
5. **Delete or wire in `ExportBar.vue`.**
6. **Fix or delete the stale mobile-nav comment.** (`NavBarMenu.vue:23-25`)
7. **Reduce always-on decorative layers** to interactive pages only.
8. **Add narrow-width fallbacks** to the nine grid-only components (low urgency).

Items 1–6 are the "stable + good-looking Pages" milestone; 7–8 are polish.
