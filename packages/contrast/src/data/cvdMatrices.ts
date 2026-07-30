/**
 * CVD simulation matrices in linear sRGB space.
 *
 * The protanopia, deuteranopia, and tritanopia coefficients are the
 * severity-1.0 matrices from the Machado–Oliveira–Fernandes
 * physiologically based CVD simulation model [MOF09]. They operate on
 * linear-sRGB channels at the dichromatic limit. The achromatopsia
 * matrix is the BT.709 (Rec. 709) luminance-projection grayscale: each
 * channel receives the same Y = 0.2126R + 0.7152G + 0.0722B, so the resulting
 * record has zero chrominance and preserves luminance perfectly. This
 * is the canonical reduction for rod-monochromacy simulation [WS82].
 *
 * Bibliography:
 *   [MOF09] Machado G.M., Oliveira M.M., Fernandes L.A.F. (2009)
 *           "A Physiologically-based Model for Simulation of Color
 *           Vision Deficiency." IEEE TVCG 15(6):1291–1298.
 *   [WS82]  Wyszecki G., Stiles W.S. (1982)
 *           "Color Science: Concepts and Methods, Quantitative Data and
 *           Formulae", 2nd ed., §3.3 (luminance projection for
 *           rod-only viewing).
 */

import type { CvdMatrixInterfaceType } from '../types/index.ts';

/** Protanopia: L-cone (red) absent. [MOF09], severity 1.0. */
export const cvdMatrices: readonly CvdMatrixInterfaceType[] = [{
  'matrix': [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281,  0.099216,
    -0.003882, -0.048116,  1.051998
  ],
  'name':   'protanopia'
},

/** Deuteranopia: M-cone (green) absent. [MOF09], severity 1.0. */
{
  'matrix': [
    0.367322,  0.860646, -0.227968,
    0.280085,  0.672501,  0.047413,
    -0.011820,  0.042940,  0.968881
  ],
  'name':   'deuteranopia'
},

/** Tritanopia: S-cone (blue) absent. [MOF09], severity 1.0. */
{
  'matrix': [
    1.255528, -0.076749, -0.178779,
    -0.078411,  0.930809,  0.147602,
    0.004733,  0.691367,  0.303900
  ],
  'name':   'tritanopia'
},

/**
 * Achromatopsia (rod monochromacy): no chromatic vision. BT.709 luminance
 * projection: each output channel receives the same scalar
 * Y = 0.2126R + 0.7152G + 0.0722B, producing a perfectly desaturated
 * record that preserves luminance contrast exactly. The matrix is
 * applied in linear sRGB before the gamma re-encoding step, identical
 * to the dichromacy path. [WS82] §3.3.
 */
{
  'matrix': [
    0.2126, 0.7152, 0.0722,
    0.2126, 0.7152, 0.0722,
    0.2126, 0.7152, 0.0722
  ],
  'name':   'achromatopsia'
}];
