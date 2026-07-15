import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

/** WCAG AA body-text ratio — the fallback for any role with no declared
 * contrast pair in the active schema (undeclared roles, Nuxt UI aliases,
 * or before a schema has resolved). */
const DEFAULT_MIN_RATIO = 4.5;

/**
 * Resolves the minRatio a role's own contrast pair declares in the active
 * schema, so `complianceFor()` scores a role against the target the
 * pipeline actually enforced — e.g. divider/syntax-comment/syntax-punctuation
 * at 3.0 — rather than always the flat WCAG-AA body-text default. Every
 * caller that classifies a role's compliance resolves through this one
 * lookup so the mapping never drifts between call sites.
 */
export function minRatioForRole(schema: RoleSchemaInterfaceType | undefined, roleName: string): number {
  const pair = schema?.contrastPairs?.find((p) => {return p.foreground === roleName;});
  return pair?.minRatio ?? DEFAULT_MIN_RATIO;
}
