import { ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { intakeHex }                              from './IntakeHex.ts';
import { intakeHsl }                              from './IntakeHsl.ts';
import { intakeImagePixels }                      from './IntakeImagePixels.ts';
import { intakeLab }                              from './IntakeLab.ts';
import { intakeNamed }                            from './IntakeNamed.ts';
import { intakeOklch }                            from './IntakeOklch.ts';
import { intakeP3 }                               from './IntakeP3.ts';
import { intakeRgb }                              from './IntakeRgb.ts';
import { isImagePixelInput }                      from './IsImagePixelInput.ts';

/**
 * Non-image delegates tried in order for every scalar entry.
 * Hex runs before Named so that any-cased three-hex-char strings like
 * `"f0f"` resolve as hex, not as a named color miss.
 */
const SCALAR_DELEGATES = [
  intakeHex,
  intakeP3,
  intakeRgb,
  intakeHsl,
  intakeOklch,
  intakeLab,
  intakeNamed
] as const;

/**
 * Attempts a single delegate's `parse` against `raw`, swallowing a parse
 * failure into `undefined`. Extracted to a wrapper so the dispatch loop in
 * {@link IntakeAny.run} does not carry a try/catch in its body (V8
 * de-optimises try/catch inside hot loops).
 */
function tryParse(
  delegate: (typeof SCALAR_DELEGATES)[number],
  raw: unknown
): ReturnType<(typeof SCALAR_DELEGATES)[number]['parse']> | undefined {
  try {
    return delegate.parse(raw);
  } catch {
    return undefined;
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

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Recommended default intake task. Dispatches each entry to the first matching format delegate. Throws if no delegate matches.',
    'name':        'intake:any',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];

      // ImageData entries produce N records (one per pixel). Handle first.
      if (isImagePixelInput(raw)) {
        intakeImagePixels.pushAllPixels(raw, state, ctx);
        continue;
      }

      // Scalar entries: try each delegate until one parse() succeeds.
      let matched = false;
      for (const delegate of SCALAR_DELEGATES) {
        const record = tryParse(delegate, raw);
        if (record === undefined) {
          // format mismatch — try next delegate
          continue;
        }
        state.colors.push(record);
        matched = true;
        ctx.logger.debug(
          LogBody.create()
            .component('IntakeAny')
            .operation('run')
            .status(LOG_STATUS.SUCCESS)
            .message('Dispatched entry')
            .context({
              'delegate': delegate.name,
              'hex':      record.hex,
              'index':    i
            })
            .build()
        );
        break;
      }

      if (!matched) {
        throw ValidationError.create({
          'message': `intake:any — entry at index ${i} does not match any known color format`,
          'path':    `input.colors[${i}]`,
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
              'index':    i,
              'received': JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match any known color format',
            'path':    `input.colors[${i}]`
          }]
        });
      }
    }

    ctx.logger.debug(
      LogBody.create()
        .component('IntakeAny')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Total colors after intake')
        .context({ 'count': state.colors.length })
        .build()
    );
  }
}

/** Singleton instance registered as the `intake:any` pipeline task. */
export const intakeAny = new IntakeAny();
