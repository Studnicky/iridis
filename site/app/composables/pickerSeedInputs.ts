import type { SeedInputType } from '../theme/types/seedInput.ts';
import type { PickerSeedType } from './types/pickerSeed.ts';

class PickerSeedInputsOperation {
  static run(seeds: readonly PickerSeedType[]): SeedInputType.Type[] {
    const inputs: SeedInputType.Type[] = [];
    for (const seed of seeds) {
      if (seed.role === undefined) {
        inputs.push(seed.hex);
      } else {
        inputs.push({ 'hex': seed.hex, 'role': seed.role });
      }
    }
    return inputs;
  }
}

export const pickerSeedInputs = PickerSeedInputsOperation.run;
