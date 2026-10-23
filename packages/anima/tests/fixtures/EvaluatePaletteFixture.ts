import { PaletteEntity } from '@studnicky/iridis-algebra';

interface EvaluatePaletteFixtureInterface {
  readonly 'from': PaletteEntity.Type;
  readonly 'to': PaletteEntity.Type;
}

export const EvaluatePaletteFixture: EvaluatePaletteFixtureInterface = Object.freeze({
  'from': PaletteEntity.create({
    'accent':     { 'c': 0.15, 'h': 10, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.98 }
  }),
  'to': PaletteEntity.create({
    'accent':     { 'c': 0.15, 'h': 240, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.10 }
  })
});
