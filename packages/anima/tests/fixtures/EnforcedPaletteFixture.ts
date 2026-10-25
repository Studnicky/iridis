import { ContrastPairEntity } from '@studnicky/iridis';
import { PaletteEntity } from '@studnicky/iridis-algebra';

interface EnforcedPaletteFixtureInterface {
  readonly 'contrastPairs': readonly ContrastPairEntity.Type[];
  readonly 'from': PaletteEntity.Type;
  readonly 'to': PaletteEntity.Type;
}

export const EnforcedPaletteFixture: EnforcedPaletteFixtureInterface = Object.freeze({
  'contrastPairs': Object.freeze([
    ContrastPairEntity.create({
      'background': 'background',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    })
  ]),
  'from': PaletteEntity.create({
    'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
    'text':       { 'c': 0.01, 'h': 240, 'l': 0.85 }
  }),
  'to': PaletteEntity.create({
    'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
    'text':       { 'c': 0.01, 'h': 240, 'l': 0.80 }
  })
});
