# Changelog

## 0.14.0

### Minor Changes

- 0ac5b09: Expose provenance-aware selected-standard compliance through the canonical enforce:compliance and report:compliance stages. input.contrast.cvdMode selects warn, nudge, or enforce CVD behavior, and nonMandatoryLevel selects AA or AAA requirements for non-mandatory pairs. APCA derives non-mandatory status from a declared pair minimum below 4.5:1. CVD evidence, corrections, and enforce-mode blockers are recorded separately at metadata['contrast:cvd'], not on the compliance report.
- 4b6918d: Failing pairs in the contrast:complianceReport carry an optional `proof` that states whether the pair is reachable at the run's resolved hues, and `analyzeSchema` reports the same reachability for a schema before any run. `analyzeSchema` certifies neutral envelopes and bounded authored hue arcs with conservative luminance witnesses. A pair whose hue is not fixed is reported as indeterminate with its sampled evidence kept separate from the proof.
- f904046: The contrast:complianceReport is `{compliant, disposition, selected, pairs, problemPairs}`, where `disposition` is resolved, best-effort or withheld and `problemPairs` is the failing subset of `pairs`. Each pair carries foreground, background, required, actual, shortfall, passed, adjustedRoles and constraints, plus an optional proof; constraints are pin, range, hue-relationship, gamut, cvd-floor or cvd-drop. The report has no blockedPairs, cvdCompliant or causes field. When withhold:compliance runs after report:compliance, input.contrast.enableStrictCompliance marks an unresolved report withheld. Connected roles are optimized jointly inside their authored ranges.

### Patch Changes

- 646d87d: The contrast README states the performance bounds and safety guarantees of schema feasibility analysis, CVD correction, and strict compliance.
- 6eb117b: Contrast repair, feasibility proofs, and the color-vision search measure candidates as plain numeric coordinates, build validated color records only for selected results, and skip CVD candidates outside the mover’s authored lightness and chroma ranges. `ColorCoordinate` is exported from `@studnicky/iridis/math`.
  
  `HueIntervalBounds` is exported from `@studnicky/iridis/math` for conservative emitted-sRGB luminance and APCA bounds over non-wrapping OKLCH hue arcs, and `RoleGeometry` is exported from `@studnicky/iridis/tasks` for consumers that apply the engine’s canonical hue-target clamp.
- 6f3c284: CVD floor and drop evaluation, simulation math, luminance and contrast measurement live in one internal evaluator that CVD correction and the terminal compliance report both use.
- 8116e75: A report withheld by input.contrast.enableStrictCompliance keeps the resolved roles and variants, so the report disposition is the only withheld signal.
- Updated dependencies [0ac5b09]
- Updated dependencies [4b6918d]
- Updated dependencies [6eb117b]
- Updated dependencies [f904046]
- Updated dependencies [13ca891]
- Updated dependencies [fda1be3]
  - @studnicky/iridis@0.14.0

## 0.13.2

### Patch Changes

- Updated dependencies
  - @studnicky/iridis@0.13.2

## 0.13.1

### Patch Changes

- `clusterDeltaEMerge` measures each color pair once and re-measures only the merged cluster, so clustering a few hundred histogram bins completes in milliseconds with identical output. `enforce:cvdSimulate` emits one aggregate warning per run carrying the warning count and affected deficiency types; per-pair detail logs at debug level and every warning remains in `metadata['contrast:cvd']`.
- Updated dependencies
  - @studnicky/iridis@0.13.1

## 0.13.0

### Patch Changes

- Updated dependencies [715f564]
  - @studnicky/iridis@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [10db49c]
  - @studnicky/iridis@0.12.0

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
