/**
 * CVD (color vision deficiency) simulation matrix shape.
 *
 * Domain: contrast checking under simulated dichromacy. Matrices project
 * linear-sRGB tristimulus values onto the confusion plane for each
 * dichromacy type and live as data literals in `data/cvdMatrices.ts`.
 */
export interface CvdMatrixInterface {
  readonly name:   'protanopia' | 'deuteranopia' | 'tritanopia';
  /** Row-major 3×3 matrix applied to linear sRGB [R, G, B] → [R', G', B'] */
  readonly matrix: readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ];
}
