import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { intakeHex }         from './IntakeHex.ts';
import { intakeRgb }         from './IntakeRgb.ts';
import { intakeHsl }         from './IntakeHsl.ts';
import { intakeOklch }       from './IntakeOklch.ts';
import { intakeLab }         from './IntakeLab.ts';
import { intakeNamed }       from './IntakeNamed.ts';
import { intakeImagePixels } from './IntakeImagePixels.ts';

const DELEGATES = [
  intakeHex,
  intakeRgb,
  intakeHsl,
  intakeOklch,
  intakeLab,
  intakeNamed,
  intakeImagePixels,
] as const;

/**
 * The default intake task. Runs every format-specific intake in order
 * over the same `state.input.colors` array; each delegate is responsible
 * for ignoring entries it doesn't recognise. Idiomatic when callers
 * don't know (or don't want to commit to) the exact format coming in.
 *
 * Order matters only for ambiguous strings — e.g. `"red"` could match
 * IntakeNamed, but the unprefixed three-character hex `"red"` is also
 * accepted by IntakeHex's loose pattern. IntakeHex runs first so hex
 * always wins when both could parse.
 */
export class IntakeAny implements TaskInterface {
  readonly 'name' = 'intake:any';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:any',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Recommended default intake task. Dispatches each input entry to the matching format-specific intake handler.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const delegate of DELEGATES) {
      delegate.run(state, ctx);
    }

    ctx.logger.debug('IntakeAny', 'run', 'Total colors after intake', { 'count': state.colors.length });
  }
}

/** Singleton instance registered as the `intake:any` pipeline task. */
export const intakeAny = new IntakeAny();
