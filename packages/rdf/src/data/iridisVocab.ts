/**
 * The iridis vocabulary — every predicate/class this package's `reason:annotate`
 * task emits, under one namespace scoped to the project itself rather than a
 * borrowed/generic name. Resource IRIs (color/role/palette/pair instances) live
 * under the sibling path tree `https://studnicky.dev/iridis/{color,role,palette,pair}/…`,
 * built by `Iri` in `../tasks/ReasonAnnotate.ts` — this class is predicates and
 * classes only.
 */
class IridisVocab {
  readonly 'base' = 'https://studnicky.dev/iridis#';

  // Classes
  readonly 'Role'  = `${this.base}Role`;
  readonly 'Color' = `${this.base}Color`;

  // Role ↔ Color / Palette structure
  readonly 'hasColor' = `${this.base}hasColor`;
  readonly 'hasRole'  = `${this.base}hasRole`;

  // Color value predicates
  readonly 'hex' = `${this.base}hex`;
  /**
   * OKLCH channel predicates — the engine's native color space. Emitted as
   * three separate xsd:decimal literals (never a dangling blank node) so a
   * SPARQL consumer can query lightness/chroma/hue directly without
   * re-deriving them from hex.
   */
  readonly 'oklchL' = `${this.base}oklchL`;
  readonly 'oklchC' = `${this.base}oklchC`;
  readonly 'oklchH' = `${this.base}oklchH`;
  /** sRGB channel predicates, `[0, 1]` — always representable, per ColorRecordInterfaceType's own guarantee. */
  readonly 'rgbR' = `${this.base}rgbR`;
  readonly 'rgbG' = `${this.base}rgbG`;
  readonly 'rgbB' = `${this.base}rgbB`;

  /**
   * Display-P3 channel predicates. Emitted by `ReasonAnnotate` for any role
   * record whose `displayP3` slot is populated (out-of-sRGB OKLCH input or
   * `intake:p3` origin). Channels are xsd:decimal literals in `[0, 1]`
   * matching CSS Color 4 `color(display-p3 r g b)` semantics.
   *
   * Absent on records derived from sRGB-only inputs; SPARQL consumers can
   * `OPTIONAL { ?c iridis:displayP3R ?r }` to surface the wide-gamut channels
   * when present and fall back to `iridis:hex` otherwise.
   */
  readonly 'displayP3R' = `${this.base}displayP3R`;
  readonly 'displayP3G' = `${this.base}displayP3G`;
  readonly 'displayP3B' = `${this.base}displayP3B`;

  // Contrast
  readonly 'wcag21Ratio' = `${this.base}wcag21Ratio`;

  /**
   * Role resolution/relations — how the engine actually arrived at this
   * role's color, not just its final value.
   */
  /** This role's color is a hue-rotated offset of another role's (ExpandFamily), rather than resolved independently from a seed. Object is the parent role's IRI. */
  readonly 'derivedFrom' = `${this.base}derivedFrom`;
  /** True when the user explicitly pinned a seed to this role (PIN_SEED_ROLE), overriding distance-matching/derivation entirely. */
  readonly 'pinned' = `${this.base}pinned`;
  /** True when no seed candidate was close enough (all exceeded the schema's max OKLCH distance) and the color was mathematically synthesized instead. */
  readonly 'synthesized' = `${this.base}synthesized`;
  /** The role schema's canonical ontology hook (RoleDefinitionInterfaceType.intent) — e.g. 'background', 'accent' — consumed by contrast/theming tasks downstream. */
  readonly 'intent' = `${this.base}intent`;

  /**
   * Clamp bounds from the role's schema definition — the RANGE the engine is
   * constrained to resolve within, independent of whether this particular run
   * actually clamped a seed into it (see `clampedFrom` for that).
   */
  readonly 'lightnessRangeMin' = `${this.base}lightnessRangeMin`;
  readonly 'lightnessRangeMax' = `${this.base}lightnessRangeMax`;
  readonly 'chromaRangeMin'    = `${this.base}chromaRangeMin`;
  readonly 'chromaRangeMax'    = `${this.base}chromaRangeMax`;
  /** Maximum degrees the resolved hue may rotate toward the schema's target `hue` (RoleDefinitionInterfaceType.hueClamp). */
  readonly 'hueClamp' = `${this.base}hueClamp`;

  /**
   * Emitted only for a role this specific run actually clamped (metadata
   * `core:roleClamps`) — the seed color that got nudged, and where it landed.
   * Object is the seed's own color IRI (`Iri.color(seedHex)`), which may or
   * may not otherwise appear as any role's `hasColor` target.
   */
  readonly 'clampedFrom' = `${this.base}clampedFrom`;
}

export const iridisVocab = new IridisVocab();
