# Iridis remediation goal

## Objective

Deliver a predictable, accessible, portable palette pipeline that accepts tiered seed input and produces complete VS Code themes through explicit dark and light contracts.

## Status

The implementation phases and release gates pass. The production audit permits two exact GitHub Pages dependency findings through 2026-11-14T23:59:59Z and rejects every other high or critical finding.

## Verified capabilities

- Core resolution pins direct and derived roles supplied through `hints.role`, preserves provenance, and retains preassigned roles during family expansion.
- `hueOffset` is a relative signed delta in every resolution path; `hue` remains the absolute bounded target.
- Source-relative lightness and chroma derivation supports surface roles, and semantic status roles have distinct tested hue relationships.
- Contrast contracts support both minimum and maximum ratios. The bidirectional solver resolves roles toward either contrast direction and reports the resulting bounds.
- VS Code seed admission accepts one strict structured input with an exact tier, framing, and role key set for the 4, 8, 16, and 64-role tiers.
- Canonical 16-role views derive from dark and light canonical 64-role schemas. Accent, status, surface, syntax, UI, terminal, source-control, diff, bracket, and widget roles share one vocabulary.
- Explicit dark and light schemas resolve the requested framing without inverting an already-resolved palette.
- VS Code UI derivation preserves pinned supplied roles, supplies the extension-role defaults, treats accent as an independent role, and applies required contrast relationships.
- The VS Code emitter consumes canonical role names, emits supported workbench, token, and semantic-token targets, emits scope coverage for every supported scope group, omits unsupported `warningForeground`, and serializes colours as sRGB `#RRGGBB` or `#RRGGBBAA` values.
- Package consumer validation exercises the published-package workflow and the consumer smoke path.

## Success criteria

- A seed with `hints.role` pins both direct and derived roles.
- `hueOffset` is a relative hue delta for every role-resolution path; absolute targeting uses `hue`.
- Every semantic status role has a distinct, tested hue relationship.
- Surface roles derive relative lightness and chroma from their source role.
- Dark and light runs use explicit schemas and pass contrast validation after role resolution.
- Accent is a first-class role that is independently configurable from keyword syntax colour.
- Every supported VS Code role and token/scope group maps to a declared output target.
- VS Code output defaults to supported sRGB hexadecimal colour strings.
- Required contrast relations cover the complete role vocabulary and support lower and upper ratio bounds.
- Typecheck, lint, unit, integration, end-to-end, package verification, consumer validation, and VS Code compatibility tests pass.
- Production dependency audit rejects every critical finding and every high finding outside the exact time-bounded GitHub Pages exception.

All implementation success criteria hold. The production audit exception expires on 2026-11-14T23:59:59Z and the release gate enforces its scope and expiry.

## Phase 1 — Canonical role contract

### Delivered contract

Core role entities and schemas define the canonical vocabulary, relative hue and source-relative derivation semantics, and bounded contrast relations. Resolver, family-expansion, and contrast contract tests cover hinted-role pinning, relative hue accumulation, bounded absolute hue, invalid ratio bands, and lower/upper ratio reports.

## Phase 2 — Seed admission and role derivation

### Delivered contract

Seed resolution handles hinted derived roles before the derived-role skip path, records the pinned roles, and preserves range clamping and non-overwrite behavior. Surface derivation is source-relative, and the warning, info, and success relationships use distinct semantic hue offsets.

## Phase 3 — Explicit VS Code schemas and contrast coverage

### Delivered contract

Dark and light canonical 64-role schemas provide the source of truth, and the 16-role schemas are views of that contract. Accent derives independently from keyword syntax colour, includes its declared contrast band, and every tier resolves the complete vocabulary. Final reports validate declared lower and upper contrast bounds.

## Phase 4 — VS Code emitter completeness and portability

### Delivered contract

The VS Code pipeline derives UI roles by canonical name and maps them to maintained workbench, token, and semantic-token targets. The scope mapping has complete supported-group coverage. `warningForeground` is absent, terminal bright white derives through canonical roles, and emitted colors use sRGB hexadecimal serialization including alpha where required.

## Phase 5 — Dependency and supply-chain remediation

### Completed batch

The root override pins `@nuxt/devtools` 3.4.3, which removes `simple-git` from the resolved graph. A one-time process-scoped release-age exception generates that lockfile resolution without changing the workspace release-age policy. The exact `js-yaml` overrides remain in place for their resolved dependency fixes.

### Time-bounded Pages audit exception

`pnpm audit --prod --audit-level=high --json` reports zero critical findings and two high-severity findings in the GitHub Pages dependency graph:

- `node-forge` 1.4.0, through `site>nuxt>@nuxt/nitro-server>nitropack>listhen>node-forge@1.4.0`.
- `braces` 3.0.3, through `site>@nuxt/content>micromatch>braces@3.0.3`.

The enforced exception permits only those exact advisory IDs and dependency paths until 2026-11-14T23:59:59Z. Expired exceptions, expanded paths, unapproved advisories, and all critical findings fail the release audit.

## Phase 6 — Verification and release readiness

### Verified gates

- Root workspace typecheck passes.
- Root workspace lint passes.
- The full workspace test suite passes with an observed successful exit status.
- The VS Code package typechecks, builds, lints, and passes all 63 tests.
- `pnpm run packages:verify` passes after a clean release build, including package consumer and consumer-smoke validation.
- A strict TypeScript check with `skipLibCheck: false` passes.
- Theme tests cover dark and light framing, tiered seed admission, sRGB and alpha serialization, scope coverage, and canonical role-to-output mapping.

### Outstanding gate

The production audit gate passes only for the two exact Pages findings through 2026-11-14T23:59:59Z. It rejects all other high and critical findings and fails when the exception expires.

## Delivery order

1. Canonical role contract.
2. Core seed admission and derivation.
3. Explicit dark/light VS Code schemas and full contrast declarations.
4. VS Code output mapping and sRGB serialization.
5. Security dependency batch.
6. Major dependency migrations.
7. Full verification and release preparation.

## Non-goals

- Do not duplicate palette derivation or contrast logic in consuming applications.
- Do not use a local fork as a long-term replacement for the upstream package contract.
- Do not rely on inverted variants as light-theme generation.
- Do not treat a logged contrast failure as a successful accessible output.
