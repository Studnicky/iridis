import type { PaletteSessionTuningPatchEntity } from './entities/PaletteSessionTuningPatchEntity.ts';

import { ExtractionSettingsEntity } from '../entities/ExtractionSettingsEntity.ts';
import { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';

/** Builds the `palette.image.tuning.set` command for a tuning control's field change. */
export class PaletteSessionTuningCommand {
  public static from(current: ExtractionSettingsEntity.Type, patch: PaletteSessionTuningPatchEntity.Type): PaletteInteractionCommandEntity.Type {
    const settings = ExtractionSettingsEntity.intake({ ...current, ...patch });
    const result = PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.image.tuning.set', 'payload': { 'settings': settings } });
    return result;
  }
}
