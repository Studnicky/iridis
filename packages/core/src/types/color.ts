/**
 * Canonical color intent ontology. Drives every downstream semantic
 * decision: forced-colors token selection (`EmitCssVars.forcedColorsToken`),
 * APCA Lc target selection (`EnforceApca`), WCAG required-ratio selection
 * (`wcagRequiredRatio`), and capacitor StatusBar style
 * (`EmitCapacitorTheme`). The schema author's declared intent is
 * authoritative; no substring inference happens anywhere downstream.
 *
 * Ten canonical members grouped by usage family:
 *  - `'text'`:       primary text content painted over a background.
 *  - `'background'`: primary surface that receives a foreground.
 *  - `'accent'`:     brand or emphasis colour calling attention.
 *  - `'muted'`:      low-emphasis text or chrome (de-emphasised content).
 *  - `'critical'`:   error / danger state signal.
 *  - `'positive'`:   success / affirmative state signal.
 *  - `'link'`:       anchor text foreground.
 *  - `'button'`:     actionable surface (button face).
 *  - `'onAccent'`:   foreground painted onto an accent surface.
 *  - `'onButton'`:   foreground painted onto a button surface.
 */
export type ColorIntentType =
  | 'text'
  | 'background'
  | 'accent'
  | 'muted'
  | 'critical'
  | 'positive'
  | 'link'
  | 'button'
  | 'onAccent'
  | 'onButton';

/**
 * Color-vision-deficiency types supported by the contrast plugin's
 * `enforce:cvdSimulate` task. Four canonical members covering the
 * three dichromacies (one missing cone) plus full achromatopsia
 * (no chromatic vision):
 *  - `'protanopia'`:    missing L-cone (red-blind);    ~1 % of males.
 *  - `'deuteranopia'`:  missing M-cone (green-blind);  ~1 % of males.
 *  - `'tritanopia'`:    missing S-cone (blue-blind);   ~0.01 % overall.
 *  - `'achromatopsia'`: no functional cones (rod monochromacy);
 *                        ~0.003 % overall. Vision reduces to luminance only.
 *
 * Partial-deficiency variants (protanomaly, deuteranomaly, tritanomaly)
 * are deliberately out of scope: the simulation matrices in the
 * literature [BVM97], [VBM99] target the dichromatic limit, and the
 * Machado/Oliveira/Fernandes 2009 parametric model collapses to those
 * matrices at severity = 1.0.
 */
export type CvdType =
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia';

export type SourceFormatType =
  | 'hex'
  | 'rgb'
  | 'hsl'
  | 'oklch'
  | 'lab'
  | 'named'
  | 'imagePixel'
  | 'displayP3';

export type ColorSpaceType = 'srgb' | 'displayP3';

export type OklchInterfaceType = {
  'c': number;
  'h': number;
  'l': number;
};

/** Result of {@link import('../math/GamutMapSrgb.ts')}'s sRGB gamut-mapping search. */
export type GamutMapResultInterfaceType = OklchInterfaceType & {
  /** `true` when the input OKLCH was already inside sRGB (no chroma reduction applied). */
  'inGamut': boolean;
};

export type RgbInterfaceType = {
  'b': number;
  'g': number;
  'r': number;
};

export type ColorHintsInterfaceType = {
  'intent'?: ColorIntentType;
  'role'?:   string;
  'weight'?: number;
};

/**
 * Canonical color record. Every record allocated anywhere in iridis
 * MUST have the same field set in the same key order so V8 collapses
 * them into a single hidden class. The optional fields use
 * `T | undefined` rather than `T?` so callers must spell out
 * `displayP3: undefined` / `hints: undefined` instead of omitting
 * the slot. Explicit-undefined keeps the shape monomorphic where
 * key-absence would create a second hidden class.
 *
 * Key order is: `oklch`, `rgb`, `hex`, `alpha`, `sourceFormat`,
 * `displayP3`, `hints`. `ColorRecordFactory` is the only sanctioned
 * allocation point; downstream code MUST NOT use `{...record, x}`
 * spread-append patterns to add or override fields because spread
 * reorders keys and breaks the hidden class.
 *
 * Field semantics:
 *  - `oklch`: the input color in OKLCH space. May lie OUTSIDE the
 *    sRGB gamut; consumers wanting wide-gamut fidelity should read this
 *    slot (or `displayP3`) rather than `rgb`.
 *  - `rgb`: the color in sRGB. ALWAYS representable on sRGB-only
 *    displays: when the input OKLCH is out-of-sRGB, the factory
 *    gamut-maps to sRGB along constant L+H (CSS Color 4 §13.2.2) and
 *    stores the mapped value here. Callers emitting sRGB-only outputs
 *    can read `rgb` (or `hex`) directly without worrying about clipping.
 *  - `hex`: `#rrggbb` derived from `rgb`. Same sRGB-safe guarantee.
 *  - `displayP3`: populated when the input OKLCH is OUT-OF-SRGB-GAMUT,
 *    or when the record arrived through `intake:p3`. Channels are
 *    clipped to `[0, 1]`. `undefined` when the input is already fully
 *    sRGB-representable, so consumers can detect "this color benefits
 *    from a wide-gamut output path" with a single `displayP3 !==
 *    undefined` check.
 *  - `hints`: soft metadata (role, intent, weight). Propagated through
 *    the pipeline; the schema-declared `intent` overrides intake-level
 *    intent at `resolve:roles`.
 */
export type ColorRecordInterfaceType = {
  'alpha':        number;
  'displayP3':    RgbInterfaceType | undefined;
  'hex':          string;
  'hints':        ColorHintsInterfaceType | undefined;
  'oklch':        OklchInterfaceType;
  'rgb':          RgbInterfaceType;
  'sourceFormat': SourceFormatType;
};
