import type { DerivationRelationInterfaceTypeEntity } from '../entities/DerivationRelationInterfaceTypeEntity.ts';

export interface HueAlgorithmBehaviorInterface {
  apply(baseHue: number, options?: { readonly 'freeformOffsets'?: readonly number[] }): readonly number[];
  createRelation(freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type;
  isFreeform(): boolean;
}
