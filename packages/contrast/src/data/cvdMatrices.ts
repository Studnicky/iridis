// CVD simulation matrices in linear sRGB space.
// Source: Brettel H., Viénot F., Mollon J.D. (1997) "Computerized simulation of color
// appearance for dichromats." Journal of the Optical Society of America A, 14(10):2647–2655.
// Protanopia / deuteranopia matrices derived from Viénot, Brettel, Mollon (1999).
// Tritanopia matrix from Brettel et al. (1997) two-half-plane model.
// Matrices project linear-sRGB tristimulus onto the confusion plane for each dichromacy.

import type { CvdMatrixInterface } from '../types/index.ts';

// Protanopia: red cone absent. Viénot et al. 1999, Table 1.
export const protanopiaMatrix: CvdMatrixInterface = {
  'name':   'protanopia',
  'matrix': [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281,  0.099216,
   -0.003882, -0.048116,  1.051998,
  ],
};

// Deuteranopia: green cone absent. Viénot et al. 1999, Table 1.
export const deuteranopiaMatrix: CvdMatrixInterface = {
  'name':   'deuteranopia',
  'matrix': [
    0.367322,  0.860646, -0.227968,
    0.280085,  0.672501,  0.047413,
   -0.011820,  0.042940,  0.968881,
  ],
};

// Tritanopia: blue/yellow cone absent. Brettel et al. 1997.
export const tritanopiaMatrix: CvdMatrixInterface = {
  'name':   'tritanopia',
  'matrix': [
    1.255528, -0.076749, -0.178779,
   -0.078411,  0.930809,  0.147602,
    0.004733,  0.691367,  0.303900,
  ],
};

export const cvdMatrices: readonly CvdMatrixInterface[] = [
  protanopiaMatrix,
  deuteranopiaMatrix,
  tritanopiaMatrix,
];
