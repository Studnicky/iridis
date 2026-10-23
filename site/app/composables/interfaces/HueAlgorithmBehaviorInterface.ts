import type { DerivationRelationEntity } from '../entities/DerivationRelationEntity.ts';

export interface HueAlgorithmBehaviorInterface {
  apply(baseHue: number, options?: { readonly 'freeformOffsets'?: readonly number[] }): readonly number[];
  createRelation(freeformOffset: number, hueVariantIndex: number): DerivationRelationEntity.Type;
  isFreeform(): boolean;
}
