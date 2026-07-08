# Docs-site migration: VitePress → Nuxt + Nuxt UI + Nuxt Content

Status: proposed, awaiting sign-off to start. Decision made July 2026: replace the
VitePress docs site with a Nuxt app using Nuxt UI (components) and Nuxt Content
(markdown docs). Supersedes the "stay on VitePress" assumption in
[`03-ui-stabilization-audit.md`](./03-ui-stabilization-audit.md) — the drawer/debounce/
bundle fixes there keep the *current* site healthy until this migration ships.

## Why (three reasons converge)

1. **Better kit, matching the workspace's React reference.** Leadography (React) uses
   the shadcn/ui pattern: Radix primitives + Tailwind v4 + cva/clsx/tailwind-merge +
   lucide + react-hook-form/zod. The Vue-native equivalent is **Reka UI** (Radix Vue,
   renamed 2025) + **Nuxt UI v4** (110+ components on Reka + Tailwind v4) / **shadcn-vue**.
   Nuxt UI is the batteries-included path: Landing + Docs templates, ⌘K search, free
   Figma kit.
2. **Resolves the security dead-end.** VitePress 1.6.4 is the latest and hard-pins an
   old Vite (`^5.4.14`) with an unfixable high-severity dev-server advisory. Nuxt tracks
   current Vite, so the vite/esbuild vulnerabilities disappear as a side effect of moving.
3. **Engine-native theming.** iridis's engine emits `--iridis-*` CSS variables. Nuxt UI /
   Tailwind v4 theme *through* CSS variables (`@theme inline`). So dogfooding becomes
   native — the engine drives the design-system tokens directly — instead of today's
   fight to cascade `--iridis-*` into `--vp-c-*` and patch PrimeVue presets.

## Target stack

| Layer | Choice | Replaces |
|---|---|---|
| Framework | Nuxt 4 (SSG via `nuxt generate` / `github_pages` preset) | VitePress |
| Components | Nuxt UI v4 (Reka UI + Tailwind v4) | PrimeVue |
| Content | Nuxt Content v3 (markdown + frontmatter, MDC for Vue-in-markdown) | VitePress markdown pipeline |
| Nav / ToC / search | `ContentNavigation`, `ContentToc`, `ContentSearch` (⌘K, no Algolia) | VitePress sidebar/ToC/local search |
| Icons | lucide-vue-next (or Nuxt UI's icon system) | (none / ad hoc) |
| Diagrams | mermaid via an MDC component | vitepress-plugin-mermaid |
| Styling | Tailwind v4 + CSS-variable tokens driven by the engine | custom `base.css`/`palette.css` + PrimeVue preset |

## What ports cleanly

- **The 37 components are already Vue 3 `<script setup>`.** They move with import swaps
  (PrimeVue → Nuxt UI) + Tailwind classes, not rewrites.
- **Engine integration is framework-agnostic**: `themeDispatcher.ts`, `applyConfigToDocument.ts`,
  `docsConfig.schema.ts`, `roleSchemas.ts`, localStorage persistence — all port as-is.
- **The markdown corpus** (concepts, reference, recipes, getting-started, index) moves into
  Nuxt Content's `content/` dir; frontmatter + folder structure becomes navigation.

## Component mapping (PrimeVue → Nuxt UI / Reka)

| Current (PrimeVue) | Nuxt UI / Reka equivalent |
|---|---|
| `Button` | `UButton` |
| `Select` | `USelect` / `USelectMenu` |
| `SelectButton` (segmented) | `UTabs` (pill) / `URadioGroup` styled |
| `InputNumber` | `UInputNumber` (Reka NumberField) |
| `InputText` | `UInput` |
| `Slider` | `USlider` (Reka Slider) — used heavily in `ImageToTheme`, pickers |
| `Tabs`/`TabPanels` | `UTabs` |
| `Accordion` | `UAccordion` |
| `Card` | `UCard` |
| `Tag` | `UBadge` |
| `Tooltip` | `UTooltip` |
| Custom `IridisPicker`, `RoleSchemaEditor`, `SchemaForm`, `ImageToTheme`, dispatcher | Keep — swap only their inner PrimeVue atoms |
| Forms (`SchemaForm`, `RoleSchemaEditor`) | Nuxt UI `UForm` + vee-validate/zod, or keep the current schema-driven form logic |

## Theming strategy (the differentiator)

1. Define the Nuxt UI / Tailwind v4 design tokens as CSS variables under `:root` / `.dark`.
2. Point the engine's projector (`applyConfigToDocument.ts` equivalent) at *those* variable
   names, so `engine.run()` output writes the actual design-system tokens.
3. Result: every Nuxt UI component (buttons, inputs, cards, code blocks) recolors through the
   engine with no per-component override — the whole site is one live `engine.run()`, which is
   the original dogfooding thesis, finally native.

## Deploy

Replace `.github/workflows/docs.yml` (VitePress build) with the Nuxt static build:

```
NUXT_APP_BASE_URL=/iridis/ npx nuxt build --preset github_pages
```

- Use the **`NUXT_APP_BASE_URL` env var**, not just `app.baseURL` in config — there is a known
  Nuxt subpath bug where `_nuxt/*` asset paths omit the base and 404 on Pages. The env-var path
  handles asset prefixing correctly.
- `ssr: true` + `nuxt generate` pre-renders all routes to static HTML for Pages.
- Nuxt uses current Vite → the vite/esbuild advisories are gone.

## Execution — sprout-and-swap

Build the new site beside the old; keep VitePress deployable until the swap is proven green.

1. **Scaffold** a Nuxt 4 + Nuxt UI + Nuxt Content app in a new top-level `site/` dir (leave
   `docs/` untouched and shipping).
2. **Theming spine first**: wire Tailwind v4 tokens ↔ engine projector; prove one page recolors
   through `engine.run()`. This is the riskiest integration — do it before porting breadth.
3. **Port the interactive core** (the crown jewels): `IridisPicker`, `BuildPanel`/try-it-out,
   `ImageToTheme`, `IridisDemo` — swapping PrimeVue atoms for Nuxt UI, guarding engine calls
   client-only. Verify each actually recomputes.
4. **Migrate the markdown corpus** into `content/`; wire `ContentNavigation`/`ContentToc`/
   `ContentSearch`; port mermaid via MDC.
5. **Port remaining components** + landing/hero.
6. **Swap the orchestrator**: point `docs.yml` at the Nuxt build, verify the deployed Pages site,
   then delete `docs/` (VitePress) and drop PrimeVue/vitepress deps. Apply the doc-rebaseline
   ([`01`](./01-doc-rebaseline.md)) to the new content in the same pass.

## Risks

- **Base-URL asset paths** on Pages (the `/iridis/` subpath) — mitigated by the env-var build.
- **SSR-unsafe engine code** — the engine + demos touch `window`/`document`; wrap in
  `<ClientOnly>` (Nuxt has it) exactly as VitePress required.
- **Search/nav parity** — `ContentSearch` (⌘K) replaces VitePress local search; verify coverage.
- **The interactive demos are the product** — each must be re-verified recomputing through the
  engine after the port, not just compiling.
- **Scope** — this is a site rebuild, not a patch. Sequence it; do not let it block the
  independent engine/package work (Phases 1, 3, 4 of the roadmap proceed in parallel).

## Relationship to the roadmap

- Replaces "Phase 2 — UI stabilization" as the docs-site end state. The already-done quick-wins
  (drawer fix, lockfile) keep the current VitePress site healthy during the build-out.
- Removes the vite/esbuild security item from the roadmap's cross-cutting blockers (resolved by
  the framework move, not an override).
- The dompurify override is still worth applying to the *current* site if it stays up during the
  migration window.
