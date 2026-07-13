import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

/** A single named state: the palette it settles at once a transition into it completes. */
export type PaletteStateInterfaceType = {
  'palette': PaletteInterfaceType;
};

/** Caller-supplied schema: state name → palette definition. */
export type PaletteStateSchemaType = Record<string, PaletteStateInterfaceType>;

/** Caller-supplied transition table: state name → allowed next-state names. */
export type PaletteTransitionTableType = Record<string, readonly string[]>;
