import { colorRecordFactory, contrastWcag21 } from '@studnicky/iridis';

/** WCAG 2.1 relative contrast ratio between two hex colors, backed by core's math primitives. */
class ContrastRatioOperation {
  static run(fg: string, bg: string): number {
    const fgRecord = colorRecordFactory.fromHex(fg);
    const bgRecord = colorRecordFactory.fromHex(bg);
    const ratio = contrastWcag21.apply(fgRecord, bgRecord);
    return ratio;
  }
}

export const contrastRatio = ContrastRatioOperation.run;
