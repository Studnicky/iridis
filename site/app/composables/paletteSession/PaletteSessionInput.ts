import { ClusterDispatcher } from '@studnicky/iridis-image';

import type { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';
import type { PaletteSessionFamilyCommandType } from './PaletteSessionFamilyCommandType.ts';

import { CvdModeEntity } from '../entities/CvdModeEntity.ts';
import { ExtractionSettingsEntity } from '../entities/ExtractionSettingsEntity.ts';
import { FramingEntity } from '../entities/FramingEntity.ts';
import { ModeEntity } from '../entities/ModeEntity.ts';
import { NonMandatoryLevelEntity } from '../entities/NonMandatoryLevelEntity.ts';
import { SchemaNameEntity } from '../entities/SchemaNameEntity.ts';
import { schemaRoleCount } from '../schemaRoleCount.ts';
import { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import { PaletteSessionSeedEntity } from './entities/PaletteSessionSeedEntity.ts';
import { PaletteSessionInteraction } from './PaletteSessionInteraction.ts';

/** Reduces admitted commands onto the input model; every result is a fresh, schema-checked input. */
export class PaletteSessionInput {
  /** Identity of the fields a palette resolution derives from; image tuning does not participate. */
  public static fingerprint(input: PaletteSessionInputEntity.Type): string {
    const result = JSON.stringify([
      input.colorSpace,
      input.cvdMode,
      input.enableStrictCompliance,
      input.framing,
      input.nonMandatoryLevel,
      input.schemaName,
      PaletteSessionInput.activeSeeds(input),
      input.strictness
    ]);
    return result;
  }

  public static activeSeeds(input: PaletteSessionInputEntity.Type): PaletteSessionSeedEntity.Type[] {
    const result = PaletteSessionInput.branded(input.mode === 'image' ? input.imageSeeds : input.pickerSeeds);
    return result;
  }

  public static initial(): PaletteSessionInputEntity.Type {
    const schemaName = SchemaNameEntity.defaultValue;
    const strategy = ClusterDispatcher.resolve('delta-e');
    const result = PaletteSessionInputEntity.create({
      'colorSpace': 'srgb',
      'cvdMode': CvdModeEntity.defaultValue,
      'enableStrictCompliance': false,
      'framing': FramingEntity.intake('dark'),
      'imageSeeds': PaletteSessionInput.defaultSeeds(),
      'imageTuning': ExtractionSettingsEntity.create({
        'algorithm': strategy.serializeAlgorithm(),
        'chromaRange': [[0, 0.5]],
        'deltaECap': 128,
        'harmonizeThreshold': 10,
        'histogramBits': 5,
        'k': schemaRoleCount(schemaName),
        'lightnessRange': [[0, 1]]
      }),
      'mode': ModeEntity.intake('picker'),
      'nonMandatoryLevel': NonMandatoryLevelEntity.defaultValue,
      'pickerSeeds': PaletteSessionInput.defaultSeeds(),
      'schemaName': schemaName,
      'strictness': 2
    });
    return result;
  }

  public static reduce(input: PaletteSessionInputEntity.Type, command: PaletteInteractionCommandEntity.Type): PaletteSessionInputEntity.Type {
    let result: PaletteSessionInputEntity.Type;
    if (PaletteSessionInteraction.isSeed(command)) {
      result = PaletteSessionInput.reduceSeed(input, command);
    } else if (PaletteSessionInteraction.isSetting(command)) {
      result = PaletteSessionInput.reduceSetting(input, command);
    } else if (command.interaction === 'palette.image.combine.applied') {
      result = PaletteSessionInput.hydrate(input, command.payload.result.extracted);
    } else if (PaletteSessionInteraction.isImageState(command)) {
      result = input;
    } else {
      result = PaletteSessionInput.unsupported(command);
    }
    return result;
  }

  private static reduceSeed(input: PaletteSessionInputEntity.Type, command: PaletteSessionFamilyCommandType<typeof PaletteSessionInteraction.seedInteractions>): PaletteSessionInputEntity.Type {
    let result: PaletteSessionInputEntity.Type;
    if (command.interaction === 'palette.seed.set') {
      result = PaletteSessionInput.setSeed(input, command.payload.index, command.payload.hex);
    } else if (command.interaction === 'palette.seed.add') {
      result = PaletteSessionInput.addSeed(input, command.payload.hex);
    } else if (command.interaction === 'palette.seed.remove') {
      result = PaletteSessionInput.removeSeed(input, command.payload.index);
    } else if (command.interaction === 'palette.seed.role.assign') {
      result = PaletteSessionInput.assignRole(input, command.payload.index, command.payload.role);
    } else {
      result = PaletteSessionInput.replaceSeeds(input, command.payload.hexes);
    }
    return result;
  }

  private static reduceSetting(input: PaletteSessionInputEntity.Type, command: PaletteSessionFamilyCommandType<typeof PaletteSessionInteraction.settingInteractions>): PaletteSessionInputEntity.Type {
    let result: PaletteSessionInputEntity.Type;
    if (command.interaction === 'palette.schema.select') {
      const imageTuning = ExtractionSettingsEntity.intake({ ...input.imageTuning, 'k': schemaRoleCount(command.payload.schemaName) });
      result = PaletteSessionInputEntity.intake({ ...input, 'imageTuning': imageTuning, 'schemaName': command.payload.schemaName });
    } else if (command.interaction === 'palette.framing.select') {
      result = PaletteSessionInputEntity.intake({ ...input, 'framing': command.payload.framing });
    } else if (command.interaction === 'palette.color-space.select') {
      result = PaletteSessionInputEntity.intake({ ...input, 'colorSpace': command.payload.colorSpace });
    } else if (command.interaction === 'palette.contrast.strictness.select') {
      result = PaletteSessionInputEntity.intake({ ...input, 'strictness': command.payload.strictness });
    } else if (command.interaction === 'palette.strict-compliance.select') {
      result = PaletteSessionInputEntity.intake({ ...input, 'enableStrictCompliance': command.payload.enableStrictCompliance });
    } else if (command.interaction === 'palette.cvd-mode.select') {
      result = PaletteSessionInputEntity.intake({ ...input, 'cvdMode': command.payload.cvdMode });
    } else if (command.interaction === 'palette.non-mandatory-level.select') {
      result = PaletteSessionInputEntity.intake({ ...input, 'nonMandatoryLevel': command.payload.nonMandatoryLevel });
    } else if (command.interaction === 'palette.mode.select') {
      result = PaletteSessionInputEntity.intake({ ...input, 'mode': command.payload.mode });
    } else {
      result = PaletteSessionInputEntity.intake({ ...input, 'imageTuning': ExtractionSettingsEntity.intake(command.payload.settings) });
    }
    return result;
  }

  private static branded(seeds: readonly unknown[]): PaletteSessionSeedEntity.Type[] {
    const result = seeds.map((seed) => {
      const checked = PaletteSessionSeedEntity.intake(seed);
      return checked;
    });
    return result;
  }

  private static defaultSeeds(): PaletteSessionSeedEntity.Type[] {
    const result = [PaletteSessionInput.seed('#000000', undefined), PaletteSessionInput.seed('#ffffff', undefined)];
    return result;
  }

  /** A combine outcome feeds both lists; no extracted colours restore the defaults. */
  private static hydrate(input: PaletteSessionInputEntity.Type, hexes: readonly string[]): PaletteSessionInputEntity.Type {
    const result = PaletteSessionInputEntity.intake({
      ...input,
      'imageSeeds': PaletteSessionInput.hydrated(PaletteSessionInput.branded(input.imageSeeds), hexes),
      'pickerSeeds': PaletteSessionInput.hydrated(PaletteSessionInput.branded(input.pickerSeeds), hexes)
    });
    return result;
  }

  private static hydrated(previous: readonly PaletteSessionSeedEntity.Type[], hexes: readonly string[]): PaletteSessionSeedEntity.Type[] {
    const result = hexes.length === 0 ? PaletteSessionInput.defaultSeeds() : PaletteSessionInput.rolePreserved(previous, hexes);
    return result;
  }

  private static addSeed(input: PaletteSessionInputEntity.Type, hex: string): PaletteSessionInputEntity.Type {
    let result = input;
    if (PaletteSessionInput.activeSeeds(input).length < PaletteSessionInputEntity.maximumSeeds) {
      result = PaletteSessionInput.withActive(input, [...PaletteSessionInput.activeSeeds(input), PaletteSessionInput.seed(hex, undefined)]);
    }
    return result;
  }

  private static assertIndex(input: PaletteSessionInputEntity.Type, index: number): void {
    if (index >= PaletteSessionInput.activeSeeds(input).length) {
      throw new RangeError(`Palette seed index ${String(index)} is outside the ${String(PaletteSessionInput.activeSeeds(input).length)} seeds`);
    }
  }

  private static assignRole(input: PaletteSessionInputEntity.Type, index: number, role: string | undefined): PaletteSessionInputEntity.Type {
    PaletteSessionInput.assertIndex(input, index);
    const seeds = PaletteSessionInput.activeSeeds(input).map((seed, seedIndex) => {
      let next = seed;
      if (seedIndex === index) {
        next = PaletteSessionInput.seed(seed.hex, role);
      } else if (role !== undefined && Object.is(seed.role, role)) {
        next = PaletteSessionInput.seed(seed.hex, undefined);
      }
      return next;
    });
    const result = PaletteSessionInput.withActive(input, seeds);
    return result;
  }

  private static removeSeed(input: PaletteSessionInputEntity.Type, index: number): PaletteSessionInputEntity.Type {
    PaletteSessionInput.assertIndex(input, index);
    let result = input;
    if (PaletteSessionInput.activeSeeds(input).length > 1) {
      const seeds = PaletteSessionInput.activeSeeds(input).filter((_seed, seedIndex) => {
        const kept = seedIndex !== index;
        return kept;
      });
      result = PaletteSessionInput.withActive(input, seeds);
    }
    return result;
  }

  private static replaceSeeds(input: PaletteSessionInputEntity.Type, hexes: readonly string[]): PaletteSessionInputEntity.Type {
    const result = PaletteSessionInput.withActive(input, PaletteSessionInput.rolePreserved(PaletteSessionInput.activeSeeds(input), hexes));
    return result;
  }

  /** A hex that survives a replacement keeps its pinned role. */
  private static rolePreserved(previous: readonly PaletteSessionSeedEntity.Type[], hexes: readonly string[]): PaletteSessionSeedEntity.Type[] {
    const roles = new Map<string, string>();
    for (let index = 0; index < previous.length; index += 1) {
      const seed = previous[index];
      if (seed?.role !== undefined) {
        roles.set(seed.hex, seed.role);
      }
    }
    const result = hexes.map((hex) => {
      const replaced = PaletteSessionInput.seed(hex, roles.get(hex));
      return replaced;
    });
    return result;
  }

  private static seed(hex: string, role: string | undefined): PaletteSessionSeedEntity.Type {
    const result = PaletteSessionSeedEntity.intake(role === undefined ? { 'hex': hex } : { 'hex': hex, 'role': role });
    return result;
  }

  private static setSeed(input: PaletteSessionInputEntity.Type, index: number, hex: string): PaletteSessionInputEntity.Type {
    PaletteSessionInput.assertIndex(input, index);
    const seeds = PaletteSessionInput.activeSeeds(input).map((seed, seedIndex) => {
      const next = seedIndex === index ? PaletteSessionInput.seed(hex, seed.role) : seed;
      return next;
    });
    const result = PaletteSessionInput.withActive(input, seeds);
    return result;
  }

  private static withActive(input: PaletteSessionInputEntity.Type, seeds: readonly PaletteSessionSeedEntity.Type[]): PaletteSessionInputEntity.Type {
    const result = PaletteSessionInputEntity.intake(input.mode === 'image' ? { ...input, 'imageSeeds': seeds } : { ...input, 'pickerSeeds': seeds });
    return result;
  }

  private static unsupported(command: never): never {
    throw new RangeError(`Unsupported palette interaction: ${JSON.stringify(command)}`);
  }
}
