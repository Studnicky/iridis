import { PaletteInterfaceTypeEntity } from '../../src/index.ts';

export const ALGEBRA_PALETTES = Object.freeze({
  'a': PaletteInterfaceTypeEntity.create({
    'background': { 'c': 0.05, 'h': 200, 'l': 0.2 },
    'text':       { 'c': 0.02, 'h': 100, 'l': 0.9 }
  }),
  'b': PaletteInterfaceTypeEntity.create({
    'background': { 'c': 0.15, 'h': 300, 'l': 0.8 },
    'text':       { 'c': 0.1, 'h': 20,  'l': 0.3 }
  })
});
