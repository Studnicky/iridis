import { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';

interface EvaluatePaletteFixtureInterface {
  readonly 'from': PaletteInterfaceTypeEntity.Type;
  readonly 'to': PaletteInterfaceTypeEntity.Type;
}

export const EvaluatePaletteFixture: EvaluatePaletteFixtureInterface = Object.freeze({
  'from': PaletteInterfaceTypeEntity.create({
    'accent':     { 'c': 0.15, 'h': 10, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.98 }
  }),
  'to': PaletteInterfaceTypeEntity.create({
    'accent':     { 'c': 0.15, 'h': 240, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.10 }
  })
});
