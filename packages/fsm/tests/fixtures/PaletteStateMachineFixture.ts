import type { PaletteEntity } from '@studnicky/iridis-algebra';

import type { PaletteStateSchemaType, PaletteTransitionTableType } from '../../src/types/index.ts';

interface PaletteStateMachineFixtureInterface {
  readonly 'states': PaletteStateSchemaType;
  readonly 'transitions': PaletteTransitionTableType;
}

const idlePalette: PaletteEntity.Type = { 'accent': { 'c': 0.05, 'h': 200, 'l': 0.5 } };
const alertPalette: PaletteEntity.Type = { 'accent': { 'c': 0.2, 'h': 20, 'l': 0.6 } };
const focusPalette: PaletteEntity.Type = { 'accent': { 'c': 0.15, 'h': 260, 'l': 0.55 } };

export const PaletteStateMachineFixture: PaletteStateMachineFixtureInterface = Object.freeze({
  'states': {
    'alert': { 'palette': alertPalette },
    'focus': { 'palette': focusPalette },
    'idle':  { 'palette': idlePalette }
  },
  'transitions': {
    'alert': [],
    'focus': ['idle'],
    'idle':  ['alert', 'focus']
  }
});
