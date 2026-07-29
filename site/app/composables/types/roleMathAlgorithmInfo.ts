import type { HueAlgorithmType } from './colorDerivation.ts';

export declare class RoleMathAlgorithmInfoType {
  'baseHue': number;
  'computedHues': number[];
  'freeformOffset': number | undefined;
  'hueAlgorithm': HueAlgorithmType.Type;
  'hueVariantIndex': number;
  /** The actual degrees this relation rotates from its parent's hue — what the engine applies via metadata['core:hueOffsetOverrides']. */
  'offsetDeg': number;
}
