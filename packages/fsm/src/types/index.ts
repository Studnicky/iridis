import type { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';

/** A single named state: the palette it settles at once a transition into it completes. */
export class PaletteStateInterfaceType {
  readonly 'palette': PaletteInterfaceTypeEntity.Type;

  constructor(palette: PaletteInterfaceTypeEntity.Type) {
    this.palette = palette;
  }
}

/** Caller-supplied schema: state name → palette definition. */
export type PaletteStateSchemaType = Record<string, PaletteStateInterfaceType>;

/** Caller-supplied transition table: state name → allowed next-state names. */
export type PaletteTransitionTableType = Record<string, readonly string[]>;
