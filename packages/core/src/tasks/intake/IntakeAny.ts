import { ValidationError } from '@studnicky/errors/node';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorInputEntity } from '../../entities/ColorInputEntity.ts';
import type { ColorRecordInterfaceTypeEntity } from '../../entities/ColorRecordInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { RawImagePixelInputInterface } from '../../interfaces/RawImagePixelInputInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { intakeHex }                              from './IntakeHex.ts';
import { intakeHsl }                              from './IntakeHsl.ts';
import { intakeImagePixels }                      from './IntakeImagePixels.ts';
import { intakeLab }                              from './IntakeLab.ts';
import { intakeNamed }                            from './IntakeNamed.ts';
import { intakeOklch }                            from './IntakeOklch.ts';
import { intakeP3 }                               from './IntakeP3.ts';
import { intakeRgb }                              from './IntakeRgb.ts';
import { IsImagePixelInput }                      from './IsImagePixelInput.ts';

/**
 * Non-image delegates tried in order for every scalar entry.
 * Hex runs before Named so that any-cased three-hex-char strings like
 * `"f0f"` resolve as hex, not as a named color miss.
 */
interface ScalarDelegateInterface {
  readonly 'name': string;
  parse(raw: ColorInputEntity.Type | RawImagePixelInputInterface): ColorRecordInterfaceTypeEntity.Type;
}

const SCALAR_DELEGATES: readonly ScalarDelegateInterface[] = [
  intakeHex,
  intakeP3,
  intakeRgb,
  intakeHsl,
  intakeOklch,
  intakeLab,
  intakeNamed
];

class ScalarDelegateDispatch {
  /**
   * Attempts a single delegate's `parse` against `raw`, swallowing a parse
   * failure into `undefined`. Extracted to a wrapper so the dispatch loop in
   * {@link IntakeAny.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  static tryParse(
    delegate: ScalarDelegateInterface,
    raw: ColorInputEntity.Type | RawImagePixelInputInterface
  ): ColorRecordInterfaceTypeEntity.Type | undefined {
    try {
      const result = delegate.parse(raw);
      return result;
    } catch {
      return undefined;
    }
  }
}

/**
 * The default intake task. Iterates `state.input.colors` per entry and
 * tries each format-specific delegate's `parse` in order via try/catch.
 * The first delegate whose `parse` succeeds wins and the result is pushed.
 * ImageData entries are dispatched to `IntakeImagePixels.pushAllPixels`
 * which pushes one record per non-transparent pixel.
 *
 * If NO delegate matches a given entry, IntakeAny throws — truly
 * malformed input is an error, not a silent no-op. Use typed intakes
 * (`intake:hex` etc.) for strict single-format enforcement.
 *
 * Order matters for ambiguous strings: IntakeHex is tried before
 * IntakeNamed so hex strings are not mistaken for named colors.
 */
class IntakeAny implements TaskInterface {
  readonly 'name' = 'intake:any';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Recommended default intake task. Dispatches each entry to the first matching format delegate. Throws if no delegate matches.',
    'name':        'intake:any',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const inputColors = state.input.colors;
    for (let inputIndex = 0; inputIndex < inputColors.length; inputIndex += 1) {
      const raw = inputColors.at(inputIndex);
      if (raw === undefined) {
        continue;
      }

      // ImageData entries produce N records (one per pixel). Handle first.
      if (IsImagePixelInput.check(raw)) {
        intakeImagePixels.pushAllPixels(raw, state, context);
        continue;
      }

      // Scalar entries: try each delegate until one parse() succeeds.
      let matched = false;
      for (let delegateIndex = 0; delegateIndex < SCALAR_DELEGATES.length; delegateIndex += 1) {
        const delegate = SCALAR_DELEGATES.at(delegateIndex);
        if (delegate === undefined) {
          continue;
        }
        const record = ScalarDelegateDispatch.tryParse(delegate, raw);
        if (record === undefined) {
          // format mismatch — try next delegate
          continue;
        }
        state.colors.push(record);
        matched = true;
        context.logger.debug(
          LogBody.create({
            'component': 'IntakeAny',
            'context': {
              'delegate': delegate.name,
              'hex':      record.hex,
              'index':    inputIndex
            },
            'message': 'Dispatched entry',
            'operation': 'run',
            'status': LOG_STATUS.SUCCESS
          })
        );
        break;
      }

      if (!matched) {
        throw ValidationError.create({
          'message': `intake:any — entry at index ${inputIndex} does not match any known color format`,
          'path':    `input.colors[${inputIndex}]`,
          'violations': [{
            'details': {
              'acceptedFormats': [
                'hex (#RGB, #RRGGBB)',
                'display-p3',
                '{r,g,b}',
                '{h,s,l}',
                '{l,c,h} (oklch)',
                '{l,a,b} (lab)',
                'CSS named color',
                'ImageData'
              ],
              'index':    inputIndex,
              'received': JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match any known color format',
            'path':    `input.colors[${inputIndex}]`
          }]
        });
      }
    }

    context.logger.debug(
      LogBody.create({
        'component': 'IntakeAny',
        'context': { 'count': state.colors.length },
        'message': 'Total colors after intake',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

/** Singleton instance registered as the `intake:any` pipeline task. */
export const intakeAny = new IntakeAny();
