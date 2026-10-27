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
  /** sRGB channel predicates, `[0, 1]` — always representable, per ColorRecordEntity's own guarantee. */
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
  /** Canonical resolution origin from `core:roleProvenance`: 'stated', 'derived', or 'synthesized'. */
  readonly 'resolutionOrigin' = `${this.base}resolutionOrigin`;
  /** Connects a role to a concrete adjustment resource for each canonical transformation. */
  readonly 'hasAdjustment' = `${this.base}hasAdjustment`;
  /** Resource type for one provenance adjustment. */
  readonly 'Adjustment' = `${this.base}Adjustment`;
  /** The color resource before a canonical provenance adjustment. */
  readonly 'adjustedFrom' = `${this.base}adjustedFrom`;
  /** The color resource after a canonical provenance adjustment. */
  readonly 'adjustedTo' = `${this.base}adjustedTo`;
  /** Canonical adjustment operation: 'hue-target', 'role-range', or 'contrast'. */
  readonly 'adjustmentOperation' = `${this.base}adjustmentOperation`;
  /** Compatibility predicate emitted when canonical provenance marks a role as caller-stated. */
  readonly 'pinned' = `${this.base}pinned`;
  /** True when no seed candidate was close enough (all exceeded the schema's max OKLCH distance) and the color was mathematically synthesized instead. */
  readonly 'synthesized' = `${this.base}synthesized`;
  /** The role schema's canonical ontology hook (RoleDefinitionEntity.intent) — e.g. 'background', 'accent' — consumed by contrast/theming tasks downstream. */
  readonly 'intent' = `${this.base}intent`;

  /**
   * Clamp bounds from the role's schema definition — the RANGE the engine is
   * constrained to resolve within, independent of whether this particular run
   * actually clamped a seed into it (see `clampedFrom` for that).
   */
  readonly 'leastPermittedLightness' = `${this.base}lightnessRangeMin`;
  readonly 'greatestPermittedLightness' = `${this.base}lightnessRangeMax`;
  readonly 'leastPermittedChroma'    = `${this.base}chromaRangeMin`;
  readonly 'greatestPermittedChroma'    = `${this.base}chromaRangeMax`;

  /**
   * Derived compatibility predicate for a canonical `role-range` adjustment.
   * The object is the color resource before that adjustment; `hasAdjustment`
   * retains the operation and exact before/after links.
   */
  readonly 'clampedFrom' = `${this.base}clampedFrom`;

  // Authored relationship graph and resolved relationship provenance.
  readonly 'RelationshipGraph' = `${this.base}RelationshipGraph`;
  readonly 'RelationshipGroup' = `${this.base}RelationshipGroup`;
  readonly 'HarmonyMode' = `${this.base}HarmonyMode`;
  readonly 'HarmonyVariant' = `${this.base}HarmonyVariant`;
  readonly 'RoleRelationship' = `${this.base}RoleRelationship`;
  readonly 'RelationshipResolution' = `${this.base}RelationshipResolution`;
  readonly 'RelationshipTolerance' = `${this.base}RelationshipTolerance`;
  readonly 'hasRelationshipGraph' = `${this.base}hasRelationshipGraph`;
  readonly 'hasRelationshipGroup' = `${this.base}hasRelationshipGroup`;
  readonly 'hasHarmonyMode' = `${this.base}hasHarmonyMode`;
  readonly 'hasHarmonyVariant' = `${this.base}hasHarmonyVariant`;
  readonly 'hasRelationship' = `${this.base}hasRelationship`;
  readonly 'hasRelationshipResolution' = `${this.base}hasRelationshipResolution`;
  readonly 'graphAnchor' = `${this.base}graphAnchor`;
  readonly 'defaultHarmonyMode' = `${this.base}defaultHarmonyMode`;
  readonly 'relationshipGroupName' = `${this.base}relationshipGroupName`;
  readonly 'harmonyVariant' = `${this.base}harmonyVariant`;
  readonly 'hueVariantId' = `${this.base}hueVariantId`;
  readonly 'hueDegrees' = `${this.base}hueDegrees`;
  readonly 'hueTarget' = `${this.base}hueTarget`;
  readonly 'hueClamp' = `${this.base}hueClamp`;
  readonly 'hueOffset' = `${this.base}hueOffset`;
  readonly 'lightnessOffset' = `${this.base}lightnessOffset`;
  readonly 'chromaScale' = `${this.base}chromaScale`;
  readonly 'interpolationWeight' = `${this.base}interpolationWeight`;
  readonly 'overlayAlpha' = `${this.base}overlayAlpha`;
  readonly 'relationshipTarget' = `${this.base}relationshipTarget`;
  readonly 'relationshipSource' = `${this.base}relationshipSource`;
  readonly 'relationshipOperation' = `${this.base}relationshipOperation`;
  readonly 'relationshipPriority' = `${this.base}relationshipPriority`;
  readonly 'relationshipRelaxability' = `${this.base}relationshipRelaxability`;
  readonly 'relationshipTolerance' = `${this.base}relationshipTolerance`;
  readonly 'toleranceAlpha' = `${this.base}toleranceAlpha`;
  readonly 'toleranceChroma' = `${this.base}toleranceChroma`;
  readonly 'toleranceHue' = `${this.base}toleranceHue`;
  readonly 'toleranceLightness' = `${this.base}toleranceLightness`;
  readonly 'resolutionRelationship' = `${this.base}resolutionRelationship`;
  readonly 'resolutionGroup' = `${this.base}resolutionGroup`;
  readonly 'resolutionMode' = `${this.base}resolutionMode`;
  readonly 'resolutionSource' = `${this.base}resolutionSource`;
  readonly 'resolutionDisposition' = `${this.base}resolutionDisposition`;
  readonly 'resolutionBlockedReason' = `${this.base}resolutionBlockedReason`;
  readonly 'resolutionBefore' = `${this.base}resolutionBefore`;
  readonly 'resolutionAfter' = `${this.base}resolutionAfter`;
  readonly 'resolutionDeviation' = `${this.base}resolutionDeviation`;
}

export const iridisVocab = new IridisVocab();
