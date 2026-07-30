import type { CvdType } from '@studnicky/iridis';
import type { CvdResultSetInterfaceType } from '@studnicky/iridis-contrast';
import type { CvdPairWarningInterfaceType } from '@studnicky/iridis-contrast/types';

class CvdVisionType {
  public readonly description: string;
  public readonly label: string;
  public readonly prevalence: string;
  public readonly value: CvdType;

  public constructor(description: string, label: string, prevalence: string, value: CvdType) {
    this.description = description;
    this.label = label;
    this.prevalence = prevalence;
    this.value = value;
  }
}

class CvdVisionReport {
  public readonly corrected: number;
  public readonly list: CvdPairWarningInterfaceType[];
  public readonly stillFailing: number;
  public readonly warnings: number;

  public constructor(
    corrected: number,
    list: CvdPairWarningInterfaceType[],
    stillFailing: number,
    warnings: number
  ) {
    this.corrected = corrected;
    this.list = list;
    this.stillFailing = stillFailing;
    this.warnings = warnings;
  }
}

export const buildCvdVisionModel = class CvdVisionModel {
  public static readonly types: readonly CvdVisionType[] = [
    new CvdVisionType(
      'The L-cone (long-wavelength, red-sensitive) is absent. Reds appear darker and can be confused with black, greens, or browns.',
      'Protanopia',
      '~1% of men',
      'protanopia'
    ),
    new CvdVisionType(
      'The M-cone (medium-wavelength, green-sensitive) is absent — the most common dichromacy. Reds and greens both shift toward a shared yellowish-brown.',
      'Deuteranopia',
      '~1% of men',
      'deuteranopia'
    ),
    new CvdVisionType(
      'The S-cone (short-wavelength, blue-sensitive) is absent. Rare, and unlike the other two, affects men and women about equally. Blues and greens, or yellows and violets, become hard to tell apart.',
      'Tritanopia',
      '<0.01% of people',
      'tritanopia'
    ),
    new CvdVisionType(
      'Complete absence of color vision (rod monochromacy) — everything resolves to luminance only, the way a black-and-white photo does.',
      'Achromatopsia',
      'very rare',
      'achromatopsia'
    )
  ];

  public static buildReport(cvd: CvdResultSetInterfaceType | undefined): CvdVisionReport | undefined {
    if (cvd === undefined) {return undefined;}
    let corrected = 0;
    let stillFailing = cvd.warnings.length;
    if (cvd.corrections !== undefined) {
      stillFailing = 0;
      for (const correction of cvd.corrections) {
        if (correction.cvdTypesRemaining.length === 0) {
          corrected++;
        } else {
          stillFailing++;
        }
      }
    }
    return new CvdVisionReport(corrected, cvd.warnings, stillFailing, cvd.warnings.length);
  }

  public static labelType(cvdType: CvdPairWarningInterfaceType['cvdType']): string {
    for (const type of CvdVisionModel.types) {
      if (type.value === cvdType) {return type.label;}
    }
    return cvdType.charAt(0).toUpperCase() + cvdType.slice(1);
  }
};
