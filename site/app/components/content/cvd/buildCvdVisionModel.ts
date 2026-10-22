import type { CvdPairWarningEntity, CvdResultSetEntity } from '@studnicky/iridis-contrast';
import type { CvdMatrixEntity } from '@studnicky/iridis-contrast/types';

abstract class CvdVisionProfile {
  public abstract value(): CvdMatrixEntity.Type['name'];
}

class ProtanopiaCvdVisionProfile extends CvdVisionProfile {
  public value(): CvdMatrixEntity.Type['name'] {
    return 'protanopia';
  }
}

class DeuteranopiaCvdVisionProfile extends CvdVisionProfile {
  public value(): CvdMatrixEntity.Type['name'] {
    return 'deuteranopia';
  }
}

class TritanopiaCvdVisionProfile extends CvdVisionProfile {
  public value(): CvdMatrixEntity.Type['name'] {
    return 'tritanopia';
  }
}

class AchromatopsiaCvdVisionProfile extends CvdVisionProfile {
  public value(): CvdMatrixEntity.Type['name'] {
    return 'achromatopsia';
  }
}

class CvdVisionType {
  public readonly description: string;
  public readonly label: string;
  public readonly prevalence: string;
  readonly #profile: CvdVisionProfile;

  public constructor(
    description: string,
    label: string,
    prevalence: string,
    profile: CvdVisionProfile
  ) {
    this.description = description;
    this.label = label;
    this.prevalence = prevalence;
    this.#profile = profile;
  }

  public get value(): CvdMatrixEntity.Type['name'] {
    const value = this.#profile.value();
    return value;
  }
}

class CvdVisionReport {
  public readonly corrected: number;
  public readonly list: CvdPairWarningEntity.Type[];
  public readonly stillFailing: number;
  public readonly warnings: number;

  public constructor(
    corrected: number,
    list: CvdPairWarningEntity.Type[],
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
      new ProtanopiaCvdVisionProfile()
    ),
    new CvdVisionType(
      'The M-cone (medium-wavelength, green-sensitive) is absent — the most common dichromacy. Reds and greens both shift toward a shared yellowish-brown.',
      'Deuteranopia',
      '~1% of men',
      new DeuteranopiaCvdVisionProfile()
    ),
    new CvdVisionType(
      'The S-cone (short-wavelength, blue-sensitive) is absent. Rare, and unlike the other two, affects men and women about equally. Blues and greens, or yellows and violets, become hard to tell apart.',
      'Tritanopia',
      '<0.01% of people',
      new TritanopiaCvdVisionProfile()
    ),
    new CvdVisionType(
      'Complete absence of color vision (rod monochromacy) — everything resolves to luminance only, the way a black-and-white photo does.',
      'Achromatopsia',
      'very rare',
      new AchromatopsiaCvdVisionProfile()
    )
  ];

  public static buildReport(cvd: CvdResultSetEntity.Type | undefined): CvdVisionReport | undefined {
    if (cvd === undefined) {return undefined;}
    let corrected = 0;
    let stillFailing = 0;
    for (let index = 0; index < cvd.corrections.length; index += 1) {
      const correction = cvd.corrections[index];
      if (correction === undefined) {continue;}
      if (correction.cvdTypesRemaining.length === 0) {
        corrected++;
      } else {
        stillFailing++;
      }
    }
    const report = new CvdVisionReport(corrected, cvd.warnings, stillFailing, cvd.warnings.length);
    return report;
  }

  public static labelType(cvdType: CvdPairWarningEntity.Type['cvdType']): string {
    for (let index = 0; index < CvdVisionModel.types.length; index += 1) {
      const type = CvdVisionModel.types[index];
      if (type?.value === cvdType) {
        return type.label;
      }
    }
    const label = cvdType.charAt(0).toUpperCase() + cvdType.slice(1);
    return label;
  }
};
