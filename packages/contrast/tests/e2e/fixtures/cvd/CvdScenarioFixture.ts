import type { PaletteStateInterface } from '@studnicky/iridis';

import { InputInterfaceTypeEntity, RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';

import { ContrastTestPort } from '../../contrast-plugin/ContrastTestPort.ts';

/** Canonical CVD test inputs and engine boundary used by the CVD scenario suite. */
export class CvdScenarioFixture {
  static readonly redGreenRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-red-green',
    'roles': [
      { 'chromaRange': [0.10, 0.40], 'hue': 29, 'lightnessRange': [0.40, 0.70], 'name': 'text', 'required': true },
      { 'chromaRange': [0.10, 0.40], 'hue': 142, 'lightnessRange': [0.40, 0.70], 'name': 'background', 'required': true }
    ]
  });

  static readonly blueYellowRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-blue-yellow',
    'roles': [
      { 'chromaRange': [0.10, 0.40], 'hue': 264, 'lightnessRange': [0.30, 0.60], 'name': 'text', 'required': true },
      { 'chromaRange': [0.10, 0.40], 'hue': 110, 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
    ]
  });

  static readonly isoluminantRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-isolum',
    'roles': [
      { 'chromaRange': [0.20, 0.30], 'hue': 29, 'lightnessRange': [0.55, 0.70], 'name': 'text', 'required': true },
      { 'chromaRange': [0.20, 0.30], 'hue': 142, 'lightnessRange': [0.70, 0.85], 'name': 'background', 'required': true }
    ]
  });

  static readonly blackWhiteRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-black-white',
    'roles': [
      { 'chromaRange': [0, 0.05], 'lightnessRange': [0, 0.20], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.05], 'lightnessRange': [0.90, 1], 'name': 'background', 'required': true }
    ]
  });

  static readonly darkAccentRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-dark-accent',
    'roles': [
      { 'chromaRange': [0.10, 0.12], 'intent': 'link', 'lightnessRange': [0.60, 0.75], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.03], 'intent': 'background', 'lightnessRange': [0.08, 0.20], 'name': 'background', 'required': true }
    ]
  });

  static readonly darkOnAccentRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-dark-on-accent',
    'roles': [
      { 'chromaRange': [0, 0.03], 'intent': 'text', 'lightnessRange': [0.08, 0.20], 'name': 'text', 'required': true },
      { 'chromaRange': [0.10, 0.12], 'intent': 'background', 'lightnessRange': [0.60, 0.75], 'name': 'background', 'required': true }
    ]
  });

  static readonly sharedForegroundRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [
      { 'algorithm': 'wcag21', 'background': 'backgroundLow', 'foreground': 'text', 'minimumContrastRatio': 1 },
      { 'algorithm': 'wcag21', 'background': 'backgroundHigh', 'foreground': 'text', 'minimumContrastRatio': 1 }
    ],
    'name': 'cvd-shared-foreground',
    'roles': [
      { 'chromaRange': [0.15, 0.30], 'hue': 29, 'lightnessRange': [0.50, 0.56], 'name': 'text', 'required': true },
      { 'chromaRange': [0.12, 0.25], 'hue': 142, 'lightnessRange': [0.48, 0.55], 'name': 'backgroundLow', 'required': true },
      { 'chromaRange': [0.15, 0.28], 'hue': 142, 'lightnessRange': [0.58, 0.64], 'name': 'backgroundHigh', 'required': true }
    ]
  });

  static readonly achromaticCorrectionRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-achromatic-correction',
    'roles': [
      { 'chromaRange': [0, 0.01], 'lightnessRange': [0.45, 0.55], 'name': 'text', 'required': true },
      { 'chromaRange': [0, 0.01], 'lightnessRange': [0.60, 0.70], 'name': 'background', 'required': true }
    ]
  });

  static readonly extremumRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-extremum',
    'roles': [
      { 'chromaRange': [0.04, 0.08], 'hue': 19, 'lightnessRange': [0.15, 0.23], 'name': 'text', 'required': true },
      { 'chromaRange': [0.05, 0.10], 'hue': 283, 'lightnessRange': [0.43, 0.52], 'name': 'background', 'required': true }
    ]
  });

  static readonly partialCorrectionRoles = RoleSchemaInterfaceTypeEntity.intake({
    'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
    'name': 'cvd-partial-correction',
    'roles': [
      { 'chromaRange': [0.13, 0.17], 'hue': 255.34034740179777, 'lightnessRange': [0.65, 0.72], 'name': 'text', 'required': true },
      { 'chromaRange': [0.24, 0.28], 'hue': 45.69293302483857, 'lightnessRange': [0.40, 0.48], 'name': 'background', 'required': true }
    ]
  });

  static input(colors: InputInterfaceTypeEntity.Type['colors'], roles: RoleSchemaInterfaceTypeEntity.Type, cvdCorrect = false): InputInterfaceTypeEntity.Type {
    const contrast = cvdCorrect ? { 'cvdCorrect': true } : undefined;
    const result = InputInterfaceTypeEntity.intake({
      'colors': colors,
      ...(contrast === undefined ? {} : { 'contrast': contrast }),
      'roles': roles
    });
    return result;
  }

  static run(input: InputInterfaceTypeEntity.Type, pipeline: readonly string[]): PaletteStateInterface {
    const engine = ContrastTestPort.createEngine();
    engine.pipeline([...pipeline]);
    const result = engine.run(input);
    return result;
  }
}
