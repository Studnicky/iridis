/**
 * CVD simulation matrices in linear sRGB space.
 *
 * The three dichromacy matrices are from the Viénot–Brettel–Mollon
 * linearised model (a numerical refinement of [BVM97] published in
 * [VBM99]); they project linear-sRGB tristimulus onto the confusion
 * plane for each missing-cone class. The achromatopsia matrix is the
 * BT.709 (Rec. 709) luminance-projection grayscale: each channel
 * receives the same Y = 0.2126R + 0.7152G + 0.0722B, so the resulting
 * record has zero chrominance and preserves luminance perfectly. This
 * is the canonical reduction for rod-monochromacy simulation [WS82].
 *
 * Bibliography:
 *   [BVM97] Brettel H., Viénot F., Mollon J.D. (1997)
 *           "Computerized simulation of color appearance for dichromats."
 *           J. Opt. Soc. Am. A 14(10):2647–2655.
 *   [VBM99] Viénot F., Brettel H., Mollon J.D. (1999)
 *           "Digital video colourmaps for checking the legibility of
 *           displays by dichromats." Color Res. Appl. 24(4):243–252.
 *           — Table 1 supplies the protanopia and deuteranopia matrices.
 *   [WS82]  Wyszecki G., Stiles W.S. (1982)
 *           "Color Science: Concepts and Methods, Quantitative Data and
 *           Formulae", 2nd ed., §3.3 (luminance projection for
 *           rod-only viewing).
 */

import type { CvdMatrixInterface } from '../types/index.ts';

/** Protanopia: L-cone (red) absent. [VBM99] Table 1, normalised. */
export const protanopiaMatrix: CvdMatrixInterface = {
  'name':   'protanopia',
  'matrix': [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281,  0.099216,
   -0.003882, -0.048116,  1.051998,
  ],
};

/** Deuteranopia: M-cone (green) absent. [VBM99] Table 1, normalised. */
export const deuteranopiaMatrix: CvdMatrixInterface = {
  'name':   'deuteranopia',
  'matrix': [
    0.367322,  0.860646, -0.227968,
    0.280085,  0.672501,  0.047413,
   -0.011820,  0.042940,  0.968881,
  ],
};

/** Tritanopia: S-cone (blue) absent. [BVM97] two-half-plane model. */
export const tritanopiaMatrix: CvdMatrixInterface = {
  'name':   'tritanopia',
  'matrix': [
    1.255528, -0.076749, -0.178779,
   -0.078411,  0.930809,  0.147602,
    0.004733,  0.691367,  0.303900,
  ],
};

/**
 * Achromatopsia (rod monochromacy): no chromatic vision. BT.709 luminance
 * projection — each output channel receives the same scalar
 * Y = 0.2126R + 0.7152G + 0.0722B, producing a perfectly desaturated
 * record that preserves luminance contrast exactly. The matrix is
 * applied in linear sRGB before the gamma re-encoding step, identical
 * to the dichromacy path. [WS82] §3.3.
 */
export const achromatopsiaMatrix: CvdMatrixInterface = {
  'name':   'achromatopsia',
  'matrix': [
    0.2126, 0.7152, 0.0722,
    0.2126, 0.7152, 0.0722,
    0.2126, 0.7152, 0.0722,
  ],
};

export const cvdMatrices: readonly CvdMatrixInterface[] = [
  protanopiaMatrix,
  deuteranopiaMatrix,
  tritanopiaMatrix,
  achromatopsiaMatrix,
];
