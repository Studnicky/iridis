import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import { colorRecordFactory } from '@studnicky/iridis';

import type { SeedInputType } from './types/seedInput.ts';

/**
 * Superset of the engine's built-in `intake:hex`: accepts plain hex strings
 * (unchanged behavior) OR `{hex, role}` objects, attaching `hints.role` on the
 * latter so ResolveRoles' hint-match path (ResolveRoles.ts:181) assigns that
 * seed to the named role directly, bypassing the nearest-OKLCH-distance
 * competition every other seed goes through.
 */
class IntakeHexHint implements TaskInterface {
  readonly 'name' = 'intake:hexHint';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses hex strings or {hex, role} pin objects into ColorRecords, attaching hints.role when a role is pinned.',
    'name':        'intake:hexHint',
    'phase':       undefined,
    'reads':       ['input.colors'],
    'requires':    undefined,
    'writes':      ['colors']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors as readonly SeedInputType[]) {
      const isPin = typeof raw === 'object' && raw !== null;
      const hex = isPin ? raw.hex : raw;
      const role = isPin ? raw.role : undefined;
      state.colors.push(colorRecordFactory.fromHex(hex, role !== undefined ? { 'hints': { 'intent': undefined, 'role': role, 'weight': undefined } } : undefined));
    }
  }
}

/** Singleton instance registered alongside coreTasks wherever seed pinning is needed. */
export const intakeHexHint = new IntakeHexHint();
