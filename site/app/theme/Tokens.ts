/**
 * iridis engine output → Nuxt UI tokens. PURE READ, ZERO color math.
 *
 * Every value written here is a hex the iridis engine produced:
 *  - `state.roles[role].hex` for the derived shortcuts, and
 *  - `state.variants['s{shade}'][role].hex` for the 50→950 scales, where each
 *    variant is an engine-run tonal step (derive:variant + lightnessTarget).
 * This module does not compute a single color; it only maps engine hexes onto
 * Nuxt UI's CSS variable names. If a role is absent at a sparse schema tier the
 * source falls back to another ENGINE-resolved role (never a computed color).
 */

import type { FramingType, RoleHexMapType, ScaleMapType } from '../composables/types/index.ts';

/** Nuxt UI alias → ordered candidate source roles (first present wins). */
const ALIAS_SOURCE: Record<string, readonly string[]> = {
  'error':     ['error', 'brand'],
  'info':      ['info', 'brand'],
  'neutral':   ['muted', 'text', 'brand'],
  'primary':   ['brand'],
  'secondary': ['accent-alt', 'brand'],
  'success':   ['success', 'brand'],
  'warning':   ['warning', 'brand']
};

/** Nuxt UI shortcut variable → ordered candidate source roles. */
const SHORTCUT_SOURCE: Record<string, readonly string[]> = {
  '--ui-bg':              ['background'],
  '--ui-bg-elevated':     ['surface', 'bg-soft', 'background'],
  '--ui-bg-muted':        ['bg-soft', 'surface', 'background'],
  '--ui-border':          ['border', 'divider', 'muted'],
  '--ui-border-accented': ['border-strong', 'border', 'muted'],
  '--ui-border-muted':    ['divider', 'border', 'muted'],
  '--ui-primary':         ['brand'],
  '--ui-text':            ['text'],
  '--ui-text-dimmed':     ['muted', 'text-subtle', 'text'],
  '--ui-text-highlighted': ['text-strong', 'text'],
  '--ui-text-muted':      ['text-subtle', 'muted', 'text']
};

function pick(roles: RoleHexMapType, candidates: readonly string[]): string | undefined {
  for (const c of candidates) {if (roles[c] !== undefined && roles[c] !== '') {return roles[c];}}
  return undefined;
}

/** Engine hexes → Nuxt UI CSS tokens, applied to the document root. */
export class Tokens {
  static readonly SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

  /**
   * Map engine output to Nuxt UI CSS variables. `roles` is `state.roles` flattened
   * to role→hex; `scales` is `state.variants` flattened to shade→role→hex.
   */
  static mapFromEngine(roles: RoleHexMapType, scales: ScaleMapType): RoleHexMapType {
    const tokens: RoleHexMapType = {};

    for (const [alias, candidates] of Object.entries(ALIAS_SOURCE)) {
      for (const shade of Tokens.SHADE_KEYS) {
        const perShade = scales[shade];
        if (perShade === undefined) {continue;}
        const hex = pick(perShade, candidates);
        if (hex !== undefined) {tokens[`--ui-color-${alias}-${shade}`] = hex;}
      }
    }

    for (const [cssVar, candidates] of Object.entries(SHORTCUT_SOURCE)) {
      const hex = pick(roles, candidates);
      if (hex !== undefined) {tokens[cssVar] = hex;}
    }

    return tokens;
  }

  /** Serializes engine tokens as a highly specific rule for SSR head injection to override UI framework defaults. */
  static toCssText(tokens: RoleHexMapType): string {
    const decls = Object.entries(tokens).map(([k, v]) => {return `${k}:${v}`;}).join(';');
    return `html:root, html:root.dark, html:root:not(.dark) {${decls}}`;
  }

  /** Every role name this mapper ever reads by name — the ground truth for "does pinning this role actually show up anywhere". */
  static candidateRoleNames(): readonly string[] {
    const names = new Set<string>();
    for (const candidates of Object.values(ALIAS_SOURCE)) {for (const c of candidates) {names.add(c);}}
    for (const candidates of Object.values(SHORTCUT_SOURCE)) {for (const c of candidates) {names.add(c);}}
    return [...names];
  }
}
