import type { CvdPairWarningEntity } from '@studnicky/iridis-contrast/types';

class CvdWarningRowModel {
  public readonly originalRatio: string;
  public readonly retainedPercent: string;
  public readonly simulatedRatio: string;

  public constructor(warning: CvdPairWarningEntity.Type) {
    this.originalRatio = warning.originalLuminanceContrast.toFixed(2);
    this.retainedPercent = (warning.simulatedContrastRatio * 100).toFixed(1);
    this.simulatedRatio = warning.simulatedLuminanceContrast.toFixed(2);
  }
}

export const buildCvdWarningRowModel = class BuildCvdWarningRowModel {
  public static build(warning: CvdPairWarningEntity.Type): CvdWarningRowModel {
    const result = new CvdWarningRowModel(warning);
    return result;
  }
};
