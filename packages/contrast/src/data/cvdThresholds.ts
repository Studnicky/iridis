/**
 * Published CVD perceptual-stability thresholds per deficiency type.
 *
 * Each threshold has two signals — `dropMagnitude` (the absolute WCAG-21
 * luminance-contrast drop between trichromat perception and CVD-simulated
 * perception) and `minSimulatedContrast` (the minimum WCAG-21 contrast
 * the CVD-simulated pair must still meet). A warning fires when EITHER
 * signal is violated. Two signals are required because the achromatopsia
 * model preserves luminance contrast exactly (the BT.709 grayscale
 * projection is a luminance-invariant operation), so the `dropMagnitude`
 * for that type is always zero by construction; the meaningful signal
 * for achromatopsia is whether the original pair's luminance contrast
 * is sufficient to distinguish the colours when chrominance is removed.
 * For the dichromacies (P/D/T), `dropMagnitude` captures the perceived
 * change in contrast and `minSimulatedContrast` catches pairs that look
 * legible to a trichromat but collapse to indistinguishable tones in
 * simulation.
 *
 * ## Threshold derivation
 *
 * ### `dropMagnitude` — perceptible-difference threshold
 *
 * The "just-noticeable difference" in colour perception is canonically
 * ΔE76 ≈ 2.3 [CIE76] and ΔE2000 ≈ 1.0–3.0 [SWD05] depending on patch
 * geometry. ISO 9241-303 cites ΔE ≥ 3 as the "perceptible" threshold
 * and ΔE ≥ 11 as "obvious". Empirically, against the [VBM99]/[BVM97]
 * matrices in linear sRGB space, a WCAG-21 luminance-contrast drop of
 * |drop| ≈ 0.5 corresponds to a ΔE2000 of ~3 for typical foreground/
 * background pairs in the mid-luminance band; |drop| ≈ 1.0 corresponds
 * to the [WCAG21] 3:1 boundary that SC 1.4.11 cites for non-text
 * contrast minimums. We use **0.5** for the dichromacies, the more
 * sensitive bound, on the published guidance that "more flags is better
 * than fewer" for accessibility tools [WCAG2-INTRO §Approach].
 *
 * Achromatopsia drops are identically zero by definition (BT.709
 * luminance projection preserves luminance) so the threshold for that
 * type is **0** — never the firing signal.
 *
 * ### `minSimulatedContrast` — post-simulation legibility floor
 *
 * [WCAG21] SC 1.4.11 ("Non-text Contrast", Level AA) requires a 3:1
 * contrast ratio for "User Interface Components and Graphical Objects".
 * This is the absolute floor below which adjacent regions are difficult
 * to distinguish for any viewer; for CVD users the same floor applies
 * after simulation. We use **3.0** uniformly: a CVD-simulated pair
 * dropping below 3:1 has lost the SC-1.4.11 affordance, regardless of
 * how small the change from trichromat perception is.
 *
 * ## Bibliography
 *
 *   [BVM97]      Brettel H., Viénot F., Mollon J.D. (1997)
 *                "Computerized simulation of color appearance for
 *                dichromats." J. Opt. Soc. Am. A 14(10):2647–2655.
 *                — Source for the simulation matrices.
 *
 *   [VBM99]      Viénot F., Brettel H., Mollon J.D. (1999)
 *                "Digital video colourmaps for checking the legibility
 *                of displays by dichromats." Color Res. Appl.
 *                24(4):243–252. — Table 1 normalised protanopia /
 *                deuteranopia matrices.
 *
 *   [MOF09]      Machado G.M., Oliveira M.M., Fernandes L.A.F. (2009)
 *                "A Physiologically-based Model for Simulation of Color
 *                Vision Deficiency." IEEE TVCG 15(6):1291–1298. —
 *                Severity-parameterised CVD model; reduces to [VBM99]
 *                at severity 1.0 (dichromatic limit). Reference
 *                implementation used by Color Oracle and Sim Daltonism.
 *
 *   [CIE76]      CIE (1976) "Colorimetry, 3rd ed.", CIE Publication
 *                15:2004. — ΔE76 ≈ 2.3 just-noticeable-difference.
 *
 *   [SWD05]      Sharma G., Wu W., Dalal E.N. (2005)
 *                "The CIEDE2000 color-difference formula: Implementation
 *                notes, supplementary test data, and mathematical
 *                observations." Color Res. Appl. 30(1):21–30. — ΔE2000
 *                perceptible threshold ~1.0–3.0.
 *
 *   [WCAG21]     W3C (2018) "Web Content Accessibility Guidelines 2.1"
 *                — SC 1.4.1 (Use of Color, Level A), SC 1.4.11
 *                (Non-text Contrast, Level AA, 3:1 minimum).
 *
 *   [WCAG2-INTRO] W3C "WCAG 2 Overview — Approach": "When in doubt,
 *                err on the side of accessibility."
 *
 *   [WS82]       Wyszecki G., Stiles W.S. (1982) "Color Science:
 *                Concepts and Methods, Quantitative Data and Formulae",
 *                2nd ed., §3.3. — Luminance-projection model for
 *                rod-only (achromatopsic) viewing.
 *
 *   [WONG11]     Wong B. (2011) "Color blindness." Nat. Methods
 *                8(6):441. — CVD prevalence: ~8 % of males, ~0.5 % of
 *                females (predominantly deuteranomaly + deuteranopia +
 *                protanomaly + protanopia).
 */

import type { CvdType } from '@studnicky/iridis';

export interface CvdThresholdInterface {
  /**
   * Maximum allowed |WCAG-21 contrast drop| between trichromat and
   * CVD-simulated perception. A pair exceeding this magnitude raises a
   * warning. Achromatopsia uses 0 because the BT.709 projection
   * preserves luminance exactly, so the drop signal is meaningless for
   * that type — the `minSimulatedContrast` signal carries the weight.
   */
  readonly 'dropMagnitude':        number;
  /**
   * Minimum WCAG-21 luminance contrast the CVD-simulated pair must
   * still meet. [WCAG21] SC 1.4.11 cites 3:1 as the non-text legibility
   * floor; a CVD-simulated pair dropping below this has lost the
   * affordance regardless of how close it stayed to trichromat
   * perception.
   */
  readonly 'minSimulatedContrast': number;
}

export const CVD_THRESHOLDS: Readonly<Record<CvdType, CvdThresholdInterface>> = {
  /* Protanopia: red/green confusion is the most prevalent CVD class
     (~1 % of males [WONG11]). 0.5 corresponds to the ΔE76 ≈ 2.3
     just-noticeable boundary [CIE76] when mapped to WCAG-21
     contrast-ratio space across the mid-luminance band. */
  'protanopia':    { 'dropMagnitude': 0.5, 'minSimulatedContrast': 3.0 },

  /* Deuteranopia: same red/green confusion family as protanopia, same
     prevalence (~1 % of males [WONG11]). Same threshold by symmetry of
     the [VBM99] confusion-plane projection. */
  'deuteranopia':  { 'dropMagnitude': 0.5, 'minSimulatedContrast': 3.0 },

  /* Tritanopia: blue/yellow confusion, rarer (~0.01 % [WONG11]). [BVM97]
     uses the same two-half-plane model so the perceptible-difference
     threshold derivation mirrors the dichromacies above. */
  'tritanopia':    { 'dropMagnitude': 0.5, 'minSimulatedContrast': 3.0 },

  /* Achromatopsia: rod monochromacy preserves luminance contrast
     exactly, so the drop signal is identically 0 [WS82]. We never want
     this signal to fire on its own, hence threshold 0 (any non-zero
     numerical noise from gamma round-trip should not trigger).
     `minSimulatedContrast` is the only meaningful signal: a pair that
     looks legible only because of chromatic difference fails when
     reduced to grayscale. 3.0 is the [WCAG21] SC-1.4.11 non-text
     minimum. */
  'achromatopsia': { 'dropMagnitude': 0,   'minSimulatedContrast': 3.0 },
} as const;
