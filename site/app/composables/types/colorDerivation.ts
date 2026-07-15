export type HueAlgorithmType = 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'split-complementary' | 'compound' | 'freeform';
export type VariationAlgorithmType = 'tints-shades' | 'saturation-gradient' | 'value-gradient';

/**
 * One parent→child derivation edge's hue algorithm. Keyed by the CHILD
 * role's own name in `DerivationConfigType.relations` — every `derivedFrom`
 * role has exactly one parent, so its own name uniquely identifies the
 * edge (matching the schema's own derivedFrom graph 1:1, the same graph
 * ColorGraph.vue renders).
 */
export type RoleRelationDerivationType = {
  /** Only read when hueAlgorithm === 'freeform' — a direct degree offset from the parent's hue. */
  'freeformOffset': number | undefined;
  'hueAlgorithm': HueAlgorithmType;
  /**
   * Most algorithms produce more than one candidate hue offset from a
   * shared base (e.g. analogous: 0°/-30°/+30°) — this picks which slot
   * this specific relation uses. Ignored when hueAlgorithm is 'freeform'.
   */
  'hueVariantIndex': number;
};

/**
 * Sparse — only relations the user has explicitly customized. A relation
 * absent here still runs through the exact same resolution path (see
 * `effectiveRelation` in utils/effectiveRelation.ts and `resolveHueOffset`
 * in utils/resolveHueOffset.ts), defaulting to 'freeform' seeded with the
 * schema's own hueOffset — so
 * there is exactly one code path from picker to pipeline, never a second,
 * silent fallback that can drift out of sync with what's shown.
 */
export type DerivationConfigType = {
  'relations': Record<string, RoleRelationDerivationType>;
};

export const DEFAULT_DERIVATION_CONFIG: DerivationConfigType = { 'relations': {} };
