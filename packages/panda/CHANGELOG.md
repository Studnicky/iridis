# Changelog

## 0.11.0

### Breaking

- `quickPalette()` is replaced by `QuickPalette.resolve()`. Import `QuickPalette` from `@studnicky/iridis` and call `QuickPalette.resolve(seeds, framing?)` for the same four-role one-shot palette result.

### Added

- `runtime.framing` selects the emitted surface. Every VS Code task resolves the same framing surface through the shared core `FramingSurface` helper, choosing between `state.roles` and `state.variants` by measured background luminance. Omitting `framing` produces byte-identical output to omitting `runtime` entirely.
- Deterministic local package verification stages and packs all 18 public packages, installs each package and its declared recursive dependency closure into one of 18 separate isolated consumer roots, and validates strict NodeNext typechecking, runtime imports, metadata, version constraints, dependency closure, and the compiled CLI executable.
- Architecture-boundary validation enforces the public package dependency graph across static and dynamic ECMAScript imports.
- Design-system lint rules enforce token purity, class-name membership, and dynamic class contracts across the documentation site.

### Changed

- All 18 public package manifests expose compiled ESM and declarations through 42 conditional `types` and `import` subpath exports. The root build emits 1,296 artifacts from 324 TypeScript sources.
- Package management moves to pnpm workspaces, and release notes are generated per package by changesets.
- The Vue and Capacitor recipe independently verifies terminal emitted values against WCAG 2.1 AAA, APCA, and configured color-vision-deficiency simulations before applying generated CSS.
- Site navigation follows rendered document order, visualization chrome consumes Iridis design-system tokens across server rendering and hydration, and motion effects honor reduced-motion preferences.
- GitHub Packages installation guidance includes registry configuration and environment-backed authentication requirements.

### Fixed

- Package archives contain every declared export target and release metadata file with zero raw TypeScript.
- VS Code theme type and workbench colors are derived from one shared light/dark measure, so an emitted theme's declared `type` always agrees with the background color it ships.
- MUI palette families derive distinct `light` and `dark` shades from the canonical role when no `s300`/`s700` shade variant is configured, instead of collapsing every shade onto `main`.
- Isolated consumer verification resolves dependencies from each declaring package, requires installed versions to satisfy declared ranges, rejects symlink extraction destinations, and prevents dependency copies from escaping their source roots.
- Stylesheet emission validates selector attribute names and custom-property prefixes and escapes dynamic selector values before interpolation.
- Corrective color-vision-deficiency simulation evaluates both lightness directions and selects the closest valid in-gamut color while preserving baseline trichromatic contrast.

### Removed

- Development-only evidence artifacts are excluded from source control and public releases.
