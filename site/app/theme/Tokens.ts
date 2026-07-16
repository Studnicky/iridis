/**
 * iridis engine output → Nuxt UI tokens.
 *
 * Every value written here originates as a hex the iridis engine produced:
 *  - `state.roles[role].hex` for the derived shortcuts, and
 *  - `state.variants['s{shade}'][role].hex` for the 50→950 scales, where each
 *    variant is an engine-run tonal step (derive:variant + lightnessTarget).
 * This module maps engine hexes onto Nuxt UI's CSS variable names; if a role
 * is absent at a sparse schema tier the source falls back to another
 * ENGINE-resolved role (never a computed color).
 *
 * One exception: `gateTextChrome()` re-checks the specific `--ui-text*`
 * shortcuts and the neutral 50–950 shades Nuxt UI's own default theme wires
 * up as text (dimmed/muted/toned/text/highlighted, across both framings)
 * against the resolved `--ui-bg`, and nudges any that fall short of WCAG AA
 * via the engine's own `ensureContrast` primitive — the same math
 * `enforce:contrast` uses on a role's base hex, applied here to the slice of
 * the tonal scale Nuxt UI actually renders as chrome text. This holds
 * regardless of which contrast-standard strictness (AA/AAA/APCA) the
 * pipeline itself is configured to enforce, so the front-end's own WCAG
 * guarantee never depends on a user-toggleable setting.
 */

import { colorRecordFactory, ensureContrast } from '@studnicky/iridis';

import type { FramingType, RoleHexMapType, ScaleMapType } from '../composables/types/index.ts';

import { contrastRatio } from './ContrastRatio.ts';

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
  // Flat accent shortcuts below are set explicitly (mirroring the ALIAS_SOURCE
  // candidates used for their own `-500` scale shade) so gateTextChrome can
  // gate them for contrast — without this, Nuxt UI's own runtime plugin
  // derives them unconditionally from `--ui-color-{alias}-500/-400`, which
  // this module never re-gates.
  '--ui-error':           ['error', 'brand'],
  '--ui-error-contrast':  ['on-error', 'error-contrast', 'background'],
  '--ui-info':            ['info', 'brand'],
  '--ui-info-contrast':   ['on-info', 'info-contrast', 'background'],
  '--ui-primary':         ['brand'],
  '--ui-primary-contrast':['on-brand', 'brand-contrast', 'background'],
  '--ui-secondary':       ['accent-alt', 'brand'],
  '--ui-success':         ['success', 'brand'],
  '--ui-success-contrast':['on-success', 'success-contrast', 'background'],
  '--ui-text':            ['text'],
  '--ui-text-dimmed':     ['muted', 'text-subtle', 'text'],
  '--ui-text-highlighted': ['text-strong', 'text'],
  '--ui-text-muted':      ['text-subtle', 'muted', 'text'],
  '--ui-warning':         ['warning', 'brand'],
  '--ui-warning-contrast':['on-warning', 'warning-contrast', 'background']
};

function pick(roles: RoleHexMapType, candidates: readonly string[]): string | undefined {
  for (const c of candidates) {if (roles[c] !== undefined && roles[c] !== '') {return roles[c];}}
  return undefined;
}

/** WCAG 2.1 AA body-text ratio the front-end's own chrome must clear, on
 * every rendered pixel, independent of the engine's own contrast-standard
 * strictness setting. Mirrors DEFAULT_MIN_RATIO in minRatioForRole.ts. */
const CHROME_TEXT_MIN_RATIO = 4.5;

/** `--ui-text*` shortcut CSS variables Nuxt UI's soft/solid/ghost/link
 * recipes render as chrome text, sourced via SHORTCUT_SOURCE from an engine
 * role hex above. */
const TEXT_SHORTCUT_VARS = ['--ui-text', '--ui-text-dimmed', '--ui-text-muted', '--ui-text-highlighted'] as const;

/**
 * Neutral-alias shade indices Nuxt UI's own default theme CSS wires to a
 * `--ui-text*` shortcut in one framing or the other (dimmed/muted/toned/text
 * read shades 200–500 in dark, 400–700 in light) — the union covers both
 * framings unconditionally since a single `mapFromEngine` call only knows
 * the shades for the framing currently resolved, not which framing is
 * active. Re-gating both halves is a no-op safety margin for the framing
 * not currently rendering, and closes the gap for any shortcut this module
 * doesn't explicitly override (`--ui-text-toned` has no SHORTCUT_SOURCE
 * entry, so it inherits Nuxt UI's own fallback straight off this scale).
 */
const NEUTRAL_TEXT_SHADES = [200, 300, 400, 500, 600, 700] as const;

/**
 * Flat accent shortcut CSS variables components render as TEXT — soft
 * buttons' `text-primary`, links, and the schema/tier pills — as opposed to
 * the `--ui-color-{alias}-{shade}` SCALE those same aliases expose for
 * filled-button backgrounds, which stays whatever hue the engine produced
 * (a background never needs to individually clear body-text contrast).
 */
const ACCENT_TEXT_VARS = ['--ui-error', '--ui-info', '--ui-primary', '--ui-secondary', '--ui-success', '--ui-warning'] as const;

/** Nudges `hex` along the OKLCH L axis (via the engine's own
 * `ensureContrast` primitive) until it clears `minRatio` against `bgHex`;
 * returns `hex` unchanged if it already clears it. */
function gateTextHex(hex: string, bgHex: string, minRatio: number): string {
  if (contrastRatio(hex, bgHex) >= minRatio) {return hex;}
  const fg = colorRecordFactory.fromHex(hex);
  const bg = colorRecordFactory.fromHex(bgHex);
  return ensureContrast.apply(fg, bg, minRatio).hex;
}

/**
 * Re-gates every text-bearing shortcut/shade this module writes against the
 * resolved `--ui-bg`, mutating `tokens` in place. Computed from whatever hex
 * the engine actually produced for the active preset/seed — never a
 * per-theme hard-coded value — so it holds by construction across all 12
 * presets × light/dark framings. Also re-gates the flat accent shortcuts
 * (`--ui-primary`/`--ui-info`/etc.) components render as text, closing the
 * cross-theme WCAG gap left by the engine's own contrast-standard setting.
 */
function gateTextChrome(tokens: RoleHexMapType): void {
  const bgHex = tokens['--ui-bg'];
  if (bgHex === undefined) {return;}

  for (const cssVar of TEXT_SHORTCUT_VARS) {
    const hex = tokens[cssVar];
    if (hex !== undefined) {tokens[cssVar] = gateTextHex(hex, bgHex, CHROME_TEXT_MIN_RATIO);}
  }

  for (const shade of NEUTRAL_TEXT_SHADES) {
    const cssVar = `--ui-color-neutral-${shade}`;
    const hex = tokens[cssVar];
    if (hex !== undefined) {tokens[cssVar] = gateTextHex(hex, bgHex, CHROME_TEXT_MIN_RATIO);}
  }

  for (const cssVar of ACCENT_TEXT_VARS) {
    const hex = tokens[cssVar];
    if (hex !== undefined) {tokens[cssVar] = gateTextHex(hex, bgHex, CHROME_TEXT_MIN_RATIO);}
  }
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
        let hex = perShade !== undefined ? pick(perShade, candidates) : undefined;
        hex ??= pick(roles, candidates);
        if (hex !== undefined) {tokens[`--ui-color-${alias}-${shade}`] = hex;}
      }
    }

    for (const [cssVar, candidates] of Object.entries(SHORTCUT_SOURCE)) {
      const hex = pick(roles, candidates);
      if (hex !== undefined) {tokens[cssVar] = hex;}
    }

    gateTextChrome(tokens);

    return tokens;
  }

  /** DOM writer. SSR-guarded; call only in the browser. */
  static apply(tokens: RoleHexMapType, framing: FramingType): void {
    if (typeof document === 'undefined') {return;}
    const root = document.documentElement;
    for (const [k, v] of Object.entries(tokens)) {root.style.setProperty(k, v);}
    root.classList.toggle('dark', framing === 'dark');
    root.dataset.iridisFraming = framing;
  }

  /** Serializes engine tokens as a highly specific rule for SSR head injection to override UI framework defaults. */
  static toCssText(tokens: RoleHexMapType): string {
    const decls = Object.entries(tokens).map(([k, v]) => {const result = `${k}:${v}`;
      return result;}).join(';');
    return `html:root, html:root.dark, html:root:not(.dark) {${decls}}`;
  }

  /** Every role name this mapper ever reads by name — the ground truth for "does pinning this role actually show up anywhere". */
  static candidateRoleNames(): readonly string[] {
    const names = new Set<string>();
    for (const candidates of Object.values(ALIAS_SOURCE)) {for (const c of candidates) {names.add(c);}}
    for (const candidates of Object.values(SHORTCUT_SOURCE)) {for (const c of candidates) {names.add(c);}}
    return [...names];
  }

  /** Resolve the raw engine hex for `--ui-color-${alias}-${shade}`, for callers (e.g. scale/swatch visualizations) that want the true, ungated engine output rather than the CSS variable — `mapFromEngine` writes this same hex except for the neutral alias's text-bearing shades, which it additionally re-gates for contrast (see `gateTextChrome`). */
  static resolveAliasShadeHex(roles: RoleHexMapType, scales: ScaleMapType, alias: string, shade: number): string | undefined {
    const candidates = ALIAS_SOURCE[alias];
    if (candidates === undefined) {return undefined;}
    const perShade = scales[shade];
    return (perShade !== undefined ? pick(perShade, candidates) : undefined) ?? pick(roles, candidates);
  }
}
