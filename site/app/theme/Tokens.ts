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
 * `enforce:compliance` uses on a role's base hex, applied here to the slice of
 * the tonal scale Nuxt UI actually renders as chrome text. This holds
 * regardless of which contrast-standard strictness (AA/AAA/APCA) the
 * pipeline itself is configured to enforce, so the front-end's own WCAG
 * guarantee never depends on a user-toggleable setting.
 */

import type { PaletteStateInterface } from '@studnicky/iridis';

import { colorRecordFactory, ensureContrast } from '@studnicky/iridis';

import type { RoleHexMapType, ScaleMapType } from '../composables/types/index.ts';

import { contrastRatio } from './ContrastRatio.ts';

/** Nuxt UI alias → ordered candidate source roles (first present wins). */
namespace TokenConstants {
  export const ALIAS_SOURCE = new Map<string, readonly string[]>([
    ['error', ['error', 'brand']],
    ['info', ['info', 'brand']],
    ['neutral', ['muted', 'text', 'brand']],
    ['primary', ['brand']],
    ['secondary', ['accent-alt', 'brand']],
    ['success', ['success', 'brand']],
    ['warning', ['warning', 'brand']]
  ]);

  /** Nuxt UI shortcut variable → ordered candidate source roles. */
  export const SHORTCUT_SOURCE = new Map<string, readonly string[]>([
    ['--ui-bg', ['background']],
    ['--ui-bg-elevated', ['surface', 'bg-soft', 'background']],
    ['--ui-bg-muted', ['bg-soft', 'surface', 'background']],
    ['--ui-border', ['border', 'divider', 'muted']],
    ['--ui-border-accented', ['border-strong', 'border', 'muted']],
    ['--ui-border-muted', ['divider', 'border', 'muted']],
    ['--ui-error', ['error', 'brand']],
    ['--ui-error-contrast', ['on-error', 'error-contrast', 'background']],
    ['--ui-info', ['info', 'brand']],
    ['--ui-info-contrast', ['on-info', 'info-contrast', 'background']],
    ['--ui-primary', ['brand']],
    ['--ui-primary-contrast', ['on-brand', 'brand-contrast', 'background']],
    ['--ui-secondary', ['accent-alt', 'brand']],
    ['--ui-success', ['success', 'brand']],
    ['--ui-success-contrast', ['on-success', 'success-contrast', 'background']],
    ['--ui-text', ['text']],
    ['--ui-text-dimmed', ['muted', 'text-subtle', 'text']],
    ['--ui-text-highlighted', ['text-strong', 'text']],
    ['--ui-text-muted', ['text-subtle', 'muted', 'text']],
    ['--ui-warning', ['warning', 'brand']],
    ['--ui-warning-contrast', ['on-warning', 'warning-contrast', 'background']]
  ]);
}

class RoleHexMapOperation {
  static toMap(roles: RoleHexMapType): Map<string, string> {
    const result = new Map<string, string>();
    const entries = Object.entries(roles);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {result.set(entry[0], entry[1]);}
    }
    return result;
  }

  static toRecord(roles: ReadonlyMap<string, string>): RoleHexMapType {
    const result: RoleHexMapType = {};
    roles.forEach((hex, name) => {Object.defineProperty(result, name, { 'configurable': true, 'enumerable': true, 'value': hex, 'writable': true });});
    return result;
  }

  static pick(roles: ReadonlyMap<string, string>, candidates: readonly string[]): string | undefined {
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (candidate === undefined) {continue;}
      const hex = roles.get(candidate);
      if (hex !== undefined && hex !== '') {return hex;}
    }
    return undefined;
  }
}



/** WCAG 2.1 AA body-text ratio the front-end's own chrome must clear, on
 * every rendered pixel, independent of the engine's own contrast-standard
 * strictness setting. Mirrors DEFAULT_MIN_RATIO in minimumRatioForRole.ts. */
namespace TokenConstants {
  export const CHROME_TEXT_MINIMUM_RATIO = 4.5;

  /** `--ui-text*` shortcut CSS variables Nuxt UI's soft/solid/ghost/link
 * recipes render as chrome text, sourced via SHORTCUT_SOURCE from an engine
 * role hex above. */
  export const TEXT_SHORTCUT_VARS = ['--ui-text', '--ui-text-dimmed', '--ui-text-muted', '--ui-text-highlighted'] as const;

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
  export const NEUTRAL_TEXT_SHADES = [200, 300, 400, 500, 600, 700] as const;

  /**
 * Flat accent shortcut CSS variables components render as TEXT — soft
 * buttons' `text-primary`, links, and the schema/tier pills — as opposed to
 * the `--ui-color-{alias}-{shade}` SCALE those same aliases expose for
 * filled-button backgrounds, which stays whatever hue the engine produced
 * (a background never needs to individually clear body-text contrast).
 */
  export const ACCENT_TEXT_VARS = ['--ui-error', '--ui-info', '--ui-primary', '--ui-secondary', '--ui-success', '--ui-warning'] as const;
}

/** Nudges `hex` along the OKLCH L axis (via the engine's own
 * `ensureContrast` primitive) until it clears `minimumRatio` against `bgHex`;
 * returns `hex` unchanged if it already clears it. */
class GateTextHexOperation {
  static run(hex: string, bgHex: string, minimumRatio: number): string {
    if (contrastRatio(hex, bgHex) >= minimumRatio) {return hex;}
    const fg = colorRecordFactory.fromHex(hex);
    const bg = colorRecordFactory.fromHex(bgHex);
    return ensureContrast.apply(fg, bg, minimumRatio).hex;
  }
}

const gateTextHex = GateTextHexOperation.run;

/**
 * Re-gates every text-bearing shortcut/shade this module writes against the
 * resolved `--ui-bg`, mutating `tokens` in place. Computed from whatever hex
 * the engine actually produced for the active preset/seed — never a
 * per-theme hard-coded value — so it holds by construction across all 12
 * presets × light/dark framings. Also re-gates the flat accent shortcuts
 * (`--ui-primary`/`--ui-info`/etc.) components render as text, closing the
 * cross-theme WCAG gap left by the engine's own contrast-standard setting.
 */
class GateTextChromeOperation {
  private static gateVariables(tokens: Map<string, string>, cssVars: readonly string[], bgHex: string): void {
    for (let index = 0; index < cssVars.length; index += 1) {
      const cssVar = cssVars[index];
      if (cssVar === undefined) {continue;}
      const hex = tokens.get(cssVar);
      if (hex !== undefined) {tokens.set(cssVar, gateTextHex(hex, bgHex, TokenConstants.CHROME_TEXT_MINIMUM_RATIO));}
    }
  }

  static run(tokens: Map<string, string>): void {
    const bgHex = tokens.get('--ui-bg');
    if (bgHex === undefined) {return;}
    GateTextChromeOperation.gateVariables(tokens, TokenConstants.TEXT_SHORTCUT_VARS, bgHex);
    GateTextChromeOperation.gateVariables(tokens, TokenConstants.ACCENT_TEXT_VARS, bgHex);

    const neutralCssVars: string[] = [];
    for (let index = 0; index < TokenConstants.NEUTRAL_TEXT_SHADES.length; index += 1) {
      const shade = TokenConstants.NEUTRAL_TEXT_SHADES[index];
      if (shade !== undefined) {neutralCssVars.push(`--ui-color-neutral-${shade}`);}
    }
    GateTextChromeOperation.gateVariables(tokens, neutralCssVars, bgHex);
  }
}



const gateTextChrome = GateTextChromeOperation.run;

/** Engine hexes → Nuxt UI CSS tokens, applied to the document root. */
export class Tokens {
  static readonly SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

  /** Flattens an engine state into the role and tonal-scale maps consumed by the site. */
  /** Flattens resolved role views to a role→hex record. */
  static hexRecord(views: readonly { readonly 'hex': string; readonly 'name': string }[]): RoleHexMapType {
    const hexes = new Map<string, string>();
    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];
      if (view !== undefined) {hexes.set(view.name, view.hex);}
    }
    const result = RoleHexMapOperation.toRecord(hexes);
    return result;
  }

  static extractEngineMaps(state: PaletteStateInterface): { 'roles': RoleHexMapType; 'scales': ScaleMapType } {
    const roles = new Map<string, string>();
    const roleEntries = Object.entries(state.roles);
    for (let roleIndex = 0; roleIndex < roleEntries.length; roleIndex += 1) {
      const entry = roleEntries[roleIndex];
      if (entry !== undefined) {roles.set(entry[0], entry[1].hex);}
    }

    const scales: ScaleMapType = {};
    const variantsByKey = new Map(Object.entries(state.variants));
    for (let shadeIndex = 0; shadeIndex < Tokens.SHADE_KEYS.length; shadeIndex += 1) {
      const shade = Tokens.SHADE_KEYS[shadeIndex];
      if (shade === undefined) {continue;}
      const variant = variantsByKey.get(`s${shade}`);
      if (variant === undefined) {continue;}
      const rolesByShade = new Map<string, string>();
      const entries = Object.entries(variant);
      for (let roleIndex = 0; roleIndex < entries.length; roleIndex += 1) {
        const entry = entries[roleIndex];
        if (entry !== undefined) {rolesByShade.set(entry[0], entry[1].hex);}
      }
      Object.defineProperty(scales, shade, { 'configurable': true, 'enumerable': true, 'value': RoleHexMapOperation.toRecord(rolesByShade), 'writable': true });
    }

    const result = { 'roles': RoleHexMapOperation.toRecord(roles), 'scales': scales };
    return result;
  }



  /**
   * Map engine output to Nuxt UI CSS variables. `roles` is `state.roles` flattened
   * to role→hex; `scales` is `state.variants` flattened to shade→role→hex.
   */
  static mapFromEngine(roles: RoleHexMapType, scales: ScaleMapType): RoleHexMapType {
    const tokens = new Map<string, string>();
    const roleMap = RoleHexMapOperation.toMap(roles);
    const scaleMap = new Map<number, Map<string, string>>();
    const scaleEntries = Object.entries(scales);
    for (let index = 0; index < scaleEntries.length; index += 1) {
      const entry = scaleEntries[index];
      if (entry !== undefined) {scaleMap.set(Number(entry[0]), RoleHexMapOperation.toMap(entry[1]));}
    }

    TokenConstants.ALIAS_SOURCE.forEach((candidates, alias) => {
      for (let shadeIndex = 0; shadeIndex < Tokens.SHADE_KEYS.length; shadeIndex += 1) {
        const shade = Tokens.SHADE_KEYS[shadeIndex];
        if (shade === undefined) {continue;}
        const perShade = scaleMap.get(shade);
        const hex = perShade === undefined ? undefined : RoleHexMapOperation.pick(perShade, candidates);
        const resolvedHex = hex ?? RoleHexMapOperation.pick(roleMap, candidates);
        if (resolvedHex !== undefined) {tokens.set(`--ui-color-${alias}-${shade}`, resolvedHex);}
      }
    });

    TokenConstants.SHORTCUT_SOURCE.forEach((candidates, cssVar) => {
      const hex = RoleHexMapOperation.pick(roleMap, candidates);
      if (hex !== undefined) {tokens.set(cssVar, hex);}
    });

    gateTextChrome(tokens);

    const result = RoleHexMapOperation.toRecord(tokens);
    return result;
  }


  /** DOM writer. SSR-guarded; call only in the browser. */
  static applyDark(tokens: RoleHexMapType): void {
    if (typeof document === 'undefined') {return;}
    const root = document.documentElement;
    Tokens.write(tokens, root);
    root.classList.add('dark');
    root.dataset.iridisFraming = 'dark';
  }

  static applyLight(tokens: RoleHexMapType): void {
    if (typeof document === 'undefined') {return;}
    const root = document.documentElement;
    Tokens.write(tokens, root);
    root.classList.remove('dark');
    root.dataset.iridisFraming = 'light';
  }

  private static write(tokens: RoleHexMapType, root: HTMLElement): void {
    const entries = Object.entries(tokens);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {root.style.setProperty(entry[0], entry[1]);}
    }
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
    TokenConstants.ALIAS_SOURCE.forEach((candidates) => {
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (candidate !== undefined) {names.add(candidate);}
      }
    });
    TokenConstants.SHORTCUT_SOURCE.forEach((candidates) => {
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (candidate !== undefined) {names.add(candidate);}
      }
    });
    const result = [...names];
    return result;
  }


  /** Resolve the raw engine hex for `--ui-color-${alias}-${shade}`, for callers (e.g. scale/swatch visualizations) that want the true, ungated engine output rather than the CSS variable — `mapFromEngine` writes this same hex except for the neutral alias's text-bearing shades, which it additionally re-gates for contrast (see `gateTextChrome`). */
  static resolveAliasShadeHex(roles: RoleHexMapType, scales: ScaleMapType, alias: string, shade: number): string | undefined {
    const candidates = TokenConstants.ALIAS_SOURCE.get(alias);
    if (candidates === undefined) {return undefined;}
    const scaleEntries = Object.entries(scales);
    const scaleEntry = scaleEntries.find((entry) => {
      const matchesShade = Number(entry[0]) === shade;
      return matchesShade;
    });
    const perShade = scaleEntry === undefined ? undefined : RoleHexMapOperation.toMap(scaleEntry[1]);
    const result = (perShade === undefined ? undefined : RoleHexMapOperation.pick(perShade, candidates)) ?? RoleHexMapOperation.pick(RoleHexMapOperation.toMap(roles), candidates);
    return result;
  }

}
