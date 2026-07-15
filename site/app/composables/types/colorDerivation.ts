export type HueAlgorithm = 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'split-complementary' | 'compound' | 'freeform';
export type VariationAlgorithm = 'tints-shades' | 'saturation-gradient' | 'value-gradient';

/**
 * One parent→child derivation edge's hue algorithm. Keyed by the CHILD
 * role's own name in `DerivationConfig.relations` — every `derivedFrom`
 * role has exactly one parent, so its own name uniquely identifies the
 * edge (matching the schema's own derivedFrom graph 1:1, the same graph
 * ColorGraph.vue renders).
 */
export interface RoleRelationDerivation {
  readonly hueAlgorithm: HueAlgorithm;
  /**
   * Most algorithms produce more than one candidate hue offset from a
   * shared base (e.g. analogous: 0°/-30°/+30°) — this picks which slot
   * this specific relation uses. Ignored when hueAlgorithm is 'freeform'.
   */
  readonly hueVariantIndex: number;
  /** Only read when hueAlgorithm === 'freeform' — a direct degree offset from the parent's hue. */
  readonly freeformOffset?: number;
}

/**
 * Sparse — only relations the user has explicitly customized. A relation
 * absent here still runs through the exact same resolution path (see
 * `effectiveRelation`/`resolveHueOffset` in utils/colorDerivation.ts),
 * defaulting to 'freeform' seeded with the schema's own hueOffset — so
 * there is exactly one code path from picker to pipeline, never a second,
 * silent fallback that can drift out of sync with what's shown.
 */
export interface DerivationConfig {
  readonly relations: Record<string, RoleRelationDerivation>;
}

export const DEFAULT_DERIVATION_CONFIG: DerivationConfig = { 'relations': {} };
