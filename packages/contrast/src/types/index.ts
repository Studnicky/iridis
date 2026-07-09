import type { CvdType } from '@studnicky/iridis';

export type CvdMatrixInterfaceType = {
  /** Row-major 3×3 matrix applied to linear sRGB [R, G, B] → [R', G', B'] */
  'matrix': [
    number, number, number,
    number, number, number,
    number, number, number
  ];
  'name':   CvdType;
};

export type * from './augmentation.ts';
