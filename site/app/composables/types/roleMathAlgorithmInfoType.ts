import type { HueAlgorithmBehaviorInterface } from '../interfaces/HueAlgorithmBehaviorInterface.ts';

export declare class RoleMathAlgorithmInfoType {
  'algorithm': HueAlgorithmBehaviorInterface;
  'baseHue': number;
  'computedHues': readonly number[];
  'freeformOffset': number | undefined;
  'hueVariantIndex': number;
  'offsetDeg': number;
}
