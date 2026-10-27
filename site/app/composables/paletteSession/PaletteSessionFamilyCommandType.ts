import type { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';

/** The admitted command variants whose `interaction` is one of `Names`. */
export type PaletteSessionFamilyCommandType<Names extends readonly string[]> = Extract<
  PaletteInteractionCommandEntity.Type,
  { 'interaction': Names[number] }
>;
