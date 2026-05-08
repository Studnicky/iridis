# Changelog

All notable changes to iridis are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@studnicky/iridis` engine package: composition spine (`Engine`, `TaskRegistry`, `ColorMathRegistry`), canonical models (`ColorRecord`, `PaletteState`, `RoleSchema`, `RuntimeOptions`), and zero runtime dependencies.
- Twenty-five built-in math primitives covering OKLCH, HSL, and sRGB color space operations; WCAG 2.1 and APCA contrast models; Brettel-Viénot CVD simulation; median-cut clustering; and contrast-preserving lightness adjustment.
- Canonical pipeline tasks: format-agnostic color intake (`intake:hex/rgb/hsl/oklch/lab/named/imagePixels/any`), clamp (`clamp:count`, `clamp:oklch`), role resolution (`resolve:roles`), parametric family expansion (`expand:family`), contrast enforcement (`enforce:contrast`), light/dark variant derivation (`derive:variant`), and JSON state emission (`emit:json`).
- Typed runtime toggle surface: `RuntimeOptionsInterface` with `framing` (`dark` | `light`), `colorSpace` (`srgb` | `displayP3`), and `extra` plugin bag. `input.runtime` flows to `state.runtime` for cross-output consumption by every emitter plugin.
- Public API exports: `@studnicky/iridis` re-exports model, registry, engine, math, and tasks modules; subpath exports for `./model`, `./registry`, `./engine`, `./math`, `./tasks`.
- Test coverage: 88 tests across Engine, TaskRegistry, ColorMathRegistry, Pipeline composition, and Math composition suites.
- First-party output plugins published independently: `-cli`, `-vscode`, `-stylesheet`, `-tailwind`, `-image`, `-contrast`, `-capacitor`, `-rdf`. Each adopts the engine via `engine.adopt(plugin)` and contributes its own `emit:*` task. Engine runs without any of them.
- VitePress documentation site scaffold with iridescent brand palette and Markdown syntax highlighting for gradient keywords.
- VitePress build aligned with reference design family (ripper, squashage, json-tology): shared `base.css` for typography, code, table, sidebar, and blockquote rules; project-specific gradients consolidated in `palette.css`; sidebar wired with Introduction / Concepts / Recipes / Reference sections; internal docs (`internal/**`) excluded from public build; `editLink` points at the active `develop` branch.
- Docs site dogfoods iridis: a sidebar accordion exposes a JSON-Schema-driven config form (seed colors, framing, contrast level/algorithm, color space, role schema). The user's settings drive every live demo on the site AND the docs theme itself — the engine emits CSS custom properties onto `document.documentElement` so the brand and surface tokens are recomputed from the user's seeds.
- Live demos on every example page (`<IridisDemo>` Vue component) embed a real `Engine` instance bound to the global config store, render canonical colors, resolved roles, and collapsible `state.outputs` JSON. Each demo ships with a paired `<IridisCode>` collapsible block showing the actual code that drives it.
- Settings persist across pages via localStorage (key: `iridis-docs-config`). SSR-safe; storage access guarded by `typeof window` checks so the static build never trips.

### Roadmap

- v0.2: Living-color animation engine (`@studnicky/iridis-anima`), reactive signal bindings (`-pulse`), palette state machine (`-fsm`), curated animation trajectories (`-trajectory`), palette algebra (`-algebra`). See [docs/v2-living-color.md](docs/v2-living-color.md).

[Unreleased]: https://github.com/Studnicky/iridis/compare/v0.0.0...HEAD
