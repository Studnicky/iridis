import type { ColorRecordInterface } from '../model/types.ts';
import { luminance } from './Luminance.ts';

export class ContrastWcag21 {
  readonly 'name' = 'contrastWcag21';

  apply(a: ColorRecordInterface, b: ColorRecordInterface): number {
    const l1 = luminance.apply(a);
    const l2 = luminance.apply(b);
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
}

export const contrastWcag21 = new ContrastWcag21();
