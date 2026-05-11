import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';
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

    ctx.logger.debug('IntakeAny', 'run', `Total colors after intake: ${state.colors.length}`);
  }
}

export const intakeAny = new IntakeAny();
