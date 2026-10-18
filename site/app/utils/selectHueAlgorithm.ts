import { buildDerivationRelations } from '../components/content/derivation/buildDerivationRelations.ts';

class SelectHueAlgorithmOperation {
  static run(serializedAlgorithm: string, baseHue: number, freeformOffsets?: number[]): readonly number[] {
    const algorithm = buildDerivationRelations.resolveHueAlgorithm(serializedAlgorithm);
    const offsets = algorithm.apply(baseHue, { 'freeformOffsets': freeformOffsets ?? [0] });
    return offsets;
  }
}

export const selectHueAlgorithm = SelectHueAlgorithmOperation.run;
