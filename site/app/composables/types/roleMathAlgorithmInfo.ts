import type { HueAlgorithmType } from './colorDerivation.ts';

export type RoleMathAlgorithmInfoType = {
  'baseHue': number;
  'computedHues': number[];
  'freeformOffset': number | undefined;
  'hueAlgorithm': HueAlgorithmType;
  'hueVariantIndex': number;
  /** The actual degrees this relation rotates from its parent's hue — what the engine applies via metadata['core:hueOffsetOverrides']. */
  'offsetDeg': number;
};
