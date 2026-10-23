import type { PaletteEntity } from '@studnicky/iridis-algebra';

/** A single named state: the palette it settles at once a transition into it completes. */
export class PaletteStateEntity {
  readonly 'palette': PaletteEntity.Type;

  constructor(palette: PaletteEntity.Type) {
    this.palette = palette;
  }
}

/** Caller-supplied schema: state name → palette definition. */
export type PaletteStateSchemaType = Record<string, PaletteStateEntity>;

/** Caller-supplied transition table: state name → allowed next-state names. */
export type PaletteTransitionTableType = Record<string, readonly string[]>;
