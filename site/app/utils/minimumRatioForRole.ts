import type { RoleSchemaEntity } from '@studnicky/iridis/model';

/** WCAG AA body-text ratio — the fallback for any role with no declared
 * contrast pair in the active schema (undeclared roles, Nuxt UI aliases,
 * or before a schema has resolved). */
const DEFAULT_MINIMUM_RATIO = 4.5;

/**
 * Resolves the minimumContrastRatio a role's own contrast pair declares in the active
 * schema, so `complianceFor()` scores a role against the target the
 * pipeline actually enforced — e.g. divider/syntax-comment/syntax-punctuation
 * at 3.0 — rather than always the flat WCAG-AA body-text default. Every
 * caller that classifies a role's compliance resolves through this one
 * lookup so the mapping never drifts between call sites.
 *
 * The 4.5 fallback intentionally still applies to roles with no declared
 * pair (border, surface, code-bg, overlay…) — those never had a real target
 * to look up here. A role like that isn't a genuine "fail" against this
 * fallback; RolesTable.vue relabels those rows 'n/a' at render time (see its
 * `isStructuralRole`) rather than this lookup returning something other
 * than a number, which would ripple `complianceFor`'s signature into every
 * non-table caller that also resolves through this function.
 */
class MinimumRatioForRoleOperation {
  static run(schema: RoleSchemaEntity.Type | undefined, roleName: string): number {
    const pair = schema?.contrastPairs?.find((contrastPair) => {
      const isForeground = contrastPair.foreground === roleName;
      return isForeground;
    });
    const minimumContrastRatio = pair?.minimumContrastRatio;
    const result = typeof minimumContrastRatio === 'number' ? minimumContrastRatio : DEFAULT_MINIMUM_RATIO;
    return result;
  }
}

export const minimumRatioForRole = MinimumRatioForRoleOperation.run;
