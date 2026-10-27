import type { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';
import type { PaletteSessionFamilyCommandType } from './PaletteSessionFamilyCommandType.ts';

/** Narrows an admitted command to the family its reducer handles. */
export class PaletteSessionInteraction {
  public static readonly imageStateInteractions = [
    'palette.image.entry.add',
    'palette.image.entry.candidate.select',
    'palette.image.entry.extracted',
    'palette.image.entry.failed',
    'palette.image.entry.remove',
    'palette.image.entry.settings.set',
    'palette.image.combine.failed',
    'palette.image.combine.lock.select',
    'palette.image.combine.request'
  ] as const;

  public static readonly seedInteractions = [
    'palette.seed.set',
    'palette.seed.add',
    'palette.seed.remove',
    'palette.seed.role.assign',
    'palette.seeds.replace'
  ] as const;

  public static readonly settingInteractions = [
    'palette.schema.select',
    'palette.framing.select',
    'palette.color-space.select',
    'palette.contrast.strictness.select',
    'palette.strict-compliance.select',
    'palette.cvd-mode.select',
    'palette.non-mandatory-level.select',
    'palette.mode.select',
    'palette.image.tuning.set'
  ] as const;

  public static isImageState(command: PaletteInteractionCommandEntity.Type): command is PaletteSessionFamilyCommandType<typeof PaletteSessionInteraction.imageStateInteractions> {
    const names: readonly string[] = PaletteSessionInteraction.imageStateInteractions;
    const result = names.includes(command.interaction);
    return result;
  }

  public static isSeed(command: PaletteInteractionCommandEntity.Type): command is PaletteSessionFamilyCommandType<typeof PaletteSessionInteraction.seedInteractions> {
    const names: readonly string[] = PaletteSessionInteraction.seedInteractions;
    const result = names.includes(command.interaction);
    return result;
  }

  public static isSetting(command: PaletteInteractionCommandEntity.Type): command is PaletteSessionFamilyCommandType<typeof PaletteSessionInteraction.settingInteractions> {
    const names: readonly string[] = PaletteSessionInteraction.settingInteractions;
    const result = names.includes(command.interaction);
    return result;
  }
}
