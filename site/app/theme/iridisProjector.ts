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

export type Framing = 'dark' | 'light';
export type RoleHexMap = Record<string, string>;
/** shade → (role → hex), one entry per engine tonal variant. */
export type ScaleMap = Record<number, RoleHexMap>;

export const SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Nuxt UI alias → ordered candidate source roles (first present wins). */
const ALIAS_SOURCE: Record<string, readonly string[]> = {
  'primary':   ['brand'],
  'secondary': ['accent-alt', 'brand'],
  'success':   ['success', 'brand'],
  'warning':   ['warning', 'brand'],
  'error':     ['error', 'brand'],
  'info':      ['info', 'brand'],
  'neutral':   ['muted', 'text', 'brand'],
};

/** Nuxt UI shortcut variable → ordered candidate source roles. */
const SHORTCUT_SOURCE: Record<string, readonly string[]> = {
  '--ui-bg':              ['background'],
  '--ui-bg-muted':        ['bg-soft', 'surface', 'background'],
  '--ui-bg-elevated':     ['surface', 'bg-soft', 'background'],
  '--ui-text':            ['text'],
  '--ui-text-highlighted': ['text-strong', 'text'],
  '--ui-text-muted':      ['text-subtle', 'muted', 'text'],
  '--ui-text-dimmed':     ['muted', 'text-subtle', 'text'],
  '--ui-border':          ['border', 'divider', 'muted'],
  '--ui-border-muted':    ['divider', 'border', 'muted'],
  '--ui-border-accented': ['border-strong', 'border', 'muted'],
  '--ui-primary':         ['brand'],
};

function pick(roles: RoleHexMap, candidates: readonly string[]): string | undefined {
  for (const c of candidates) if (roles[c]) return roles[c];
  return undefined;
}

/**
 * Map engine output to Nuxt UI CSS variables. `roles` is `state.roles` flattened
 * to role→hex; `scales` is `state.variants` flattened to shade→role→hex.
 */
export function mapEngineToTokens(roles: RoleHexMap, scales: ScaleMap): RoleHexMap {
  const tokens: RoleHexMap = {};

  for (const [alias, candidates] of Object.entries(ALIAS_SOURCE)) {
    for (const shade of SHADE_KEYS) {
      const perShade = scales[shade];
      if (!perShade) continue;
      const hex = pick(perShade, candidates);
      if (hex) tokens[`--ui-color-${alias}-${shade}`] = hex;
    }
  }

  for (const [cssVar, candidates] of Object.entries(SHORTCUT_SOURCE)) {
    const hex = pick(roles, candidates);
    if (hex) tokens[cssVar] = hex;
  }

  return tokens;
}

/** DOM writer. SSR-guarded; call only in the browser. */
export function applyTokens(tokens: RoleHexMap, framing: Framing): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
  root.classList.toggle('dark', framing === 'dark');
  root.dataset['iridisFraming'] = framing;
}
