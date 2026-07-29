/**
 * Resolves which role set an `emit:*` task should read from, and the
 * single shared "is this light or dark" measure every plugin uses to
 * answer that question.
 *
 * `state.runtime.framing` is public API (see {@link RuntimeOptionsInterface})
 * but does nothing on its own: `resolve:roles` always populates
 * `state.roles` from the intake seeds regardless of the requested
 * framing, and `derive:variant` only ever adds alternate surfaces to
 * `state.variants`. An emitter that wants `framing` honored must ask
 * `FramingSurface.resolve` for the role set to render, rather than
 * reading `state.roles` directly.
 *
 * Appearance is always the WCAG relative luminance
 * ({@link import('../math/Luminance.ts').luminance}) of the `background`
 * role, thresholded at 0.5 — the same measure `contrastText` and
 * `ensureContrast` use elsewhere in this codebase, so a theme's
 * declared light/dark type always agrees with the contrast math that
 * shaped its colors. This is the single reconciliation point: no
 * plugin should compute its own light/dark threshold.
 *
 * `DEFAULT_VARIANTS` (see
 * {@link import('../tasks/derive/DeriveVariant.ts').deriveVariant}) names
 * variants after the transform applied, not the resulting appearance:
 * given dark seeds, the `dark`-named variant inverts lightness and so
 * reads light, while the `light`-named variant is left untouched and
 * stays dark-appearing. `resolve` never matches a variant by name — it
 * measures each candidate's actual appearance and picks the one that
 * matches the requested framing.
 */

import type {
  ColorRecordInterfaceType,
  PaletteStateInterface
} from '../types/index.ts';

import { luminance } from '../math/Luminance.ts';

/** WCAG relative-luminance threshold above which a role set reads as a light theme. */
const LIGHT_LUMINANCE_THRESHOLD = 0.5;

class FramingSurface {
  /**
   * True when `roles.background`'s WCAG relative luminance exceeds the
   * light/dark threshold. Missing `background` reads as dark (false),
   * matching the pre-`framing` default across every emitter.
   */
  static isLight(roles: Readonly<Record<string, ColorRecordInterfaceType>>): boolean {
    const background = roles.background;
    if (background === undefined) { return false; }
    return luminance.apply(background) > LIGHT_LUMINANCE_THRESHOLD;
  }

  /**
   * Returns the role set an `emit:*` task should render for this run.
   *
   * - `state.runtime.framing` unset → `state.roles`, unchanged. This
   *   keeps every consumer that never set `framing` on byte-identical
   *   output.
   * - `state.runtime.framing` set and already matches `state.roles`'s
   *   measured appearance → `state.roles`.
   * - Otherwise → the first entry in `state.variants` whose measured
   *   appearance matches the requested framing. Falls back to
   *   `state.roles` when no variant matches (e.g. `derive:variant`
   *   did not run, or every configured variant shares one appearance).
   */
  static resolve(state: PaletteStateInterface): Readonly<Record<string, ColorRecordInterfaceType>> {
    const framing = state.runtime.framing;
    if (framing === undefined) { return state.roles; }

    const wantsLight = framing === 'light';
    if (FramingSurface.isLight(state.roles) === wantsLight) { return state.roles; }

    for (const variantRoles of Object.values(state.variants)) {
      if (FramingSurface.isLight(variantRoles) === wantsLight) { return variantRoles; }
    }

    return state.roles;
  }
}

export { FramingSurface };
