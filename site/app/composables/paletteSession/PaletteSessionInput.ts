import { ClusterDispatcher } from '@studnicky/iridis-image';

import type { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';

import { CvdModeEntity } from '../entities/CvdModeEntity.ts';
import { ExtractionSettingsEntity } from '../entities/ExtractionSettingsEntity.ts';
import { FramingEntity } from '../entities/FramingEntity.ts';
import { NonMandatoryLevelEntity } from '../entities/NonMandatoryLevelEntity.ts';
import { SchemaNameEntity } from '../entities/SchemaNameEntity.ts';
import { schemaRoleCount } from '../schemaRoleCount.ts';
import { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import { PaletteSessionSeedEntity } from './entities/PaletteSessionSeedEntity.ts';

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
      input.seeds,
      input.strictness
    ]);
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
      'imageTuning': ExtractionSettingsEntity.create({
        'algorithm': strategy.serializeAlgorithm(),
        'chromaRange': [[0, 0.5]],
        'deltaECap': 128,
        'harmonizeThreshold': 10,
        'histogramBits': 5,
        'k': schemaRoleCount(schemaName),
        'lightnessRange': [[0, 1]]
      }),
      'nonMandatoryLevel': NonMandatoryLevelEntity.defaultValue,
      'schemaName': schemaName,
      'seeds': [{ 'hex': '#000000' }, { 'hex': '#ffffff' }],
      'strictness': 2
    });
    return result;
  }

  public static reduce(input: PaletteSessionInputEntity.Type, command: PaletteInteractionCommandEntity.Type): PaletteSessionInputEntity.Type {
    let result: PaletteSessionInputEntity.Type;
    if (command.interaction === 'palette.seed.set') {
      result = PaletteSessionInput.setSeed(input, command.payload.index, command.payload.hex);
    } else if (command.interaction === 'palette.seed.add') {
      result = PaletteSessionInput.addSeed(input, command.payload.hex);
    } else if (command.interaction === 'palette.seed.remove') {
      result = PaletteSessionInput.removeSeed(input, command.payload.index);
    } else if (command.interaction === 'palette.seed.role.assign') {
      result = PaletteSessionInput.assignRole(input, command.payload.index, command.payload.role);
    } else if (command.interaction === 'palette.seeds.replace') {
      result = PaletteSessionInput.replaceSeeds(input, command.payload.hexes);
    } else if (command.interaction === 'palette.schema.select') {
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
    } else if (command.interaction === 'palette.image.tuning.set') {
      result = PaletteSessionInputEntity.intake({ ...input, 'imageTuning': ExtractionSettingsEntity.intake(command.payload.settings) });
    } else if (command.interaction === 'palette.image.combine.request') {
      result = input;
    } else {
      result = PaletteSessionInput.unsupported(command);
    }
    return result;
  }

  private static addSeed(input: PaletteSessionInputEntity.Type, hex: string): PaletteSessionInputEntity.Type {
    let result = input;
    if (input.seeds.length < PaletteSessionInputEntity.maximumSeeds) {
      result = PaletteSessionInputEntity.intake({ ...input, 'seeds': [...input.seeds, PaletteSessionInput.seed(hex, undefined)] });
    }
    return result;
  }

  private static assertIndex(input: PaletteSessionInputEntity.Type, index: number): void {
    if (index >= input.seeds.length) {
      throw new RangeError(`Palette seed index ${String(index)} is outside the ${String(input.seeds.length)} seeds`);
    }
  }

  private static assignRole(input: PaletteSessionInputEntity.Type, index: number, role: string | undefined): PaletteSessionInputEntity.Type {
    PaletteSessionInput.assertIndex(input, index);
    const seeds = input.seeds.map((seed, seedIndex) => {
      let next = seed;
      if (seedIndex === index) {
        next = PaletteSessionInput.seed(seed.hex, role);
      } else if (role !== undefined && Object.is(seed.role, role)) {
        next = PaletteSessionInput.seed(seed.hex, undefined);
      }
      return next;
    });
    const result = PaletteSessionInputEntity.intake({ ...input, 'seeds': seeds });
    return result;
  }

  private static removeSeed(input: PaletteSessionInputEntity.Type, index: number): PaletteSessionInputEntity.Type {
    PaletteSessionInput.assertIndex(input, index);
    let result = input;
    if (input.seeds.length > 1) {
      const seeds = input.seeds.filter((_seed, seedIndex) => {
        const kept = seedIndex !== index;
        return kept;
      });
      result = PaletteSessionInputEntity.intake({ ...input, 'seeds': seeds });
    }
    return result;
  }

  /** A hex that survives the replacement keeps its pinned role. */
  private static replaceSeeds(input: PaletteSessionInputEntity.Type, hexes: readonly string[]): PaletteSessionInputEntity.Type {
    const roles = new Map<string, string>();
    for (let index = 0; index < input.seeds.length; index += 1) {
      const seed = input.seeds[index];
      if (seed?.role !== undefined) {
        roles.set(seed.hex, seed.role);
      }
    }
    const seeds = hexes.map((hex) => {
      const replaced = PaletteSessionInput.seed(hex, roles.get(hex));
      return replaced;
    });
    const result = PaletteSessionInputEntity.intake({ ...input, 'seeds': seeds });
    return result;
  }

  private static seed(hex: string, role: string | undefined): PaletteSessionSeedEntity.Type {
    const result = PaletteSessionSeedEntity.intake(role === undefined ? { 'hex': hex } : { 'hex': hex, 'role': role });
    return result;
  }

  private static setSeed(input: PaletteSessionInputEntity.Type, index: number, hex: string): PaletteSessionInputEntity.Type {
    PaletteSessionInput.assertIndex(input, index);
    const seeds = input.seeds.map((seed, seedIndex) => {
      const next = seedIndex === index ? PaletteSessionInput.seed(hex, seed.role) : seed;
      return next;
    });
    const result = PaletteSessionInputEntity.intake({ ...input, 'seeds': seeds });
    return result;
  }

  private static unsupported(command: never): never {
    throw new RangeError(`Unsupported palette interaction: ${JSON.stringify(command)}`);
  }
}
