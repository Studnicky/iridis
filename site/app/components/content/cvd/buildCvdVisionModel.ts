import type { CvdType } from '@studnicky/iridis';
import type { CvdResultSetInterfaceType } from '@studnicky/iridis-contrast';
import type { CvdPairWarningInterfaceType } from '@studnicky/iridis-contrast/types';

export const CVD_TYPES: { value: CvdType; label: string; prevalence: string; description: string }[] = [
  {
    'value': 'protanopia',
    'label': 'Protanopia',
    'prevalence': '~1% of men',
    'description': 'The L-cone (long-wavelength, red-sensitive) is absent. Reds appear darker and can be confused with black, greens, or browns.'
  },
  {
    'value': 'deuteranopia',
    'label': 'Deuteranopia',
    'prevalence': '~1% of men',
    'description': 'The M-cone (medium-wavelength, green-sensitive) is absent — the most common dichromacy. Reds and greens both shift toward a shared yellowish-brown.'
  },
  {
    'value': 'tritanopia',
    'label': 'Tritanopia',
    'prevalence': '<0.01% of people',
    'description': 'The S-cone (short-wavelength, blue-sensitive) is absent. Rare, and unlike the other two, affects men and women about equally. Blues and greens, or yellows and violets, become hard to tell apart.'
  },
  {
    'value': 'achromatopsia',
    'label': 'Achromatopsia',
    'prevalence': 'very rare',
    'description': 'Complete absence of color vision (rod monochromacy) — everything resolves to luminance only, the way a black-and-white photo does.'
  }
];

export function buildCvdReport(cvd: CvdResultSetInterfaceType | undefined):
| {
    corrected: number;
    list: CvdPairWarningInterfaceType[];
    stillFailing: number;
    warnings: number;
  }
| undefined {
  if (cvd === undefined) return undefined;
  const corrected = cvd.corrections?.filter((correction) => correction.cvdTypesRemaining.length === 0).length ?? 0;
  const stillFailing = cvd.corrections?.filter((correction) => correction.cvdTypesRemaining.length > 0).length ?? Math.max(cvd.warnings.length, 0);
  return { 'corrected': corrected, 'list': cvd.warnings, 'stillFailing': stillFailing, 'warnings': cvd.warnings.length };
}

export function cvdTypeLabel(cvdType: CvdPairWarningInterfaceType['cvdType']): string {
  const match = CVD_TYPES.find((type) => type.value === cvdType);
  if (match !== undefined) return match.label;
  return cvdType.charAt(0).toUpperCase() + cvdType.slice(1);
}
