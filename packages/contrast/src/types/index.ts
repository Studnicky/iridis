import type { CvdType } from '@studnicky/iridis';

export interface CvdMatrixInterface {
  readonly 'name':   CvdType;
  /** Row-major 3×3 matrix applied to linear sRGB [R, G, B] → [R', G', B'] */
  readonly 'matrix': readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ];
}

export type * from './augmentation.ts';
