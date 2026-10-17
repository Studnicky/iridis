import { ContrastPairInterfaceTypeEntity } from '@studnicky/iridis';
import { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';

interface EnforcedPaletteFixtureInterface {
  readonly 'contrastPairs': readonly ContrastPairInterfaceTypeEntity.Type[];
  readonly 'from': PaletteInterfaceTypeEntity.Type;
  readonly 'to': PaletteInterfaceTypeEntity.Type;
}

export const EnforcedPaletteFixture: EnforcedPaletteFixtureInterface = Object.freeze({
  'contrastPairs': Object.freeze([
    ContrastPairInterfaceTypeEntity.create({
      'background': 'background',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    })
  ]),
  'from': PaletteInterfaceTypeEntity.create({
    'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
    'text':       { 'c': 0.01, 'h': 240, 'l': 0.85 }
  }),
  'to': PaletteInterfaceTypeEntity.create({
    'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
    'text':       { 'c': 0.01, 'h': 240, 'l': 0.80 }
  })
});
