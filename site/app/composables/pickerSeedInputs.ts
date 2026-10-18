import type { PickerSeedType } from './types/pickerSeedType.ts';

import { SeedInputEntity } from '../theme/types/SeedInputEntity.ts';

class PickerSeedInputsOperation {
  static run(seeds: readonly PickerSeedType[]): SeedInputEntity.Type[] {
    const inputs: SeedInputEntity.Type[] = [];
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      if (seed === undefined) {continue;}
      if (seed.role === undefined) {
        inputs.push(SeedInputEntity.intake(seed.hex));
      } else {
        inputs.push(SeedInputEntity.intake({ 'hex': seed.hex, 'role': seed.role }));
      }
    }
    return inputs;
  }
}

export const pickerSeedInputs = PickerSeedInputsOperation.run;
