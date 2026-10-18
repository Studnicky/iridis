import type { HueAlgorithmBehaviorInterface } from '../interfaces/HueAlgorithmBehaviorInterface.ts';

/** Canonical derivation behavior and relation state admitted into the palette pipeline. */
export namespace ColorDerivation {
  export declare class RoleRelation {
    'algorithm': HueAlgorithmBehaviorInterface;
    'freeformOffset': number | undefined;
    'hueVariantIndex': number;
  }

  export declare class Config {
    'relations': Record<string, RoleRelation>;
  }

  export const defaultConfig: Config = { 'relations': {} };
}
