export interface CvdMatrixInterface {
  readonly 'name':   'protanopia' | 'deuteranopia' | 'tritanopia';
  /** Row-major 3×3 matrix applied to linear sRGB [R, G, B] → [R', G', B'] */
  readonly 'matrix': readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ];
}
