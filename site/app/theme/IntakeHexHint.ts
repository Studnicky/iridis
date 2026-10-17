import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { colorRecordFactory, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

import { SeedInputEntity } from './types/SeedInputEntity.ts';

/**
 * Superset of the engine's built-in `intake:hex`: accepts plain hex strings
 * (unchanged behavior) OR `{hex, role}` objects, attaching `hints.role` on the
 * latter so ResolveRoles' hint-match path (ResolveRoles.ts:181) assigns that
 * seed to the named role directly, bypassing the nearest-OKLCH-distance
 * competition every other seed goes through.
 */
class IntakeHexHint implements TaskInterface {
  readonly 'name' = 'intake:hexHint';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Parses hex strings or {hex, role} pin objects into ColorRecords, attaching hints.role when a role is pinned.',
    'name':        'intake:hexHint',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    for (let index = 0; index < state.input.colors.length; index += 1) {
      const rawInput = state.input.colors[index];
      if (rawInput === undefined) {continue;}
      const input = SeedInputEntity.intake(rawInput);
      if (typeof input === 'object') {
        state.colors.push(colorRecordFactory.fromHex(input.hex, { 'hints': { 'intent': undefined, 'role': input.role, 'weight': undefined } }));
        continue;
      }
      state.colors.push(colorRecordFactory.fromHex(input));
    }
  }
}

/** Singleton instance registered alongside coreTasks wherever seed pinning is needed. */
export const intakeHexHint = new IntakeHexHint();
