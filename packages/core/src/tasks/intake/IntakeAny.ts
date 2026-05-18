import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { intakeHex }                              from './IntakeHex.ts';
import { intakeRgb }                              from './IntakeRgb.ts';
import { intakeHsl }                              from './IntakeHsl.ts';
import { intakeOklch }                            from './IntakeOklch.ts';
import { intakeLab }                              from './IntakeLab.ts';
import { intakeNamed }                            from './IntakeNamed.ts';
import { intakeImagePixels, isImagePixelInput }   from './IntakeImagePixels.ts';
import { intakeP3 }                               from './IntakeP3.ts';

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
  intakeNamed,
] as const;

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
export class IntakeAny implements TaskInterface {
  readonly 'name' = 'intake:any';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:any',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Recommended default intake task. Dispatches each entry to the first matching format delegate. Throws if no delegate matches.',
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
        try {
          const record = delegate.parse(raw);
          state.colors.push(record);
          matched = true;
          ctx.logger.debug('IntakeAny', 'run', 'Dispatched entry', {
            'index':    i,
            'delegate': delegate.name,
            'hex':      record.hex,
          });
          break;
        } catch {
          // format mismatch — try next delegate
        }
      }

      if (!matched) {
        throw new Error(
          `intake:any — entry at index ${i} does not match any known color format. ` +
          `Accepted formats: hex (#RGB, #RRGGBB), display-p3, {r,g,b}, {h,s,l}, ` +
          `{l,c,h} (oklch), {l,a,b} (lab), CSS named color, ImageData. ` +
          `Got: ${JSON.stringify(raw)}`,
        );
      }
    }

    ctx.logger.debug('IntakeAny', 'run', 'Total colors after intake', { 'count': state.colors.length });
  }
}

/** Singleton instance registered as the `intake:any` pipeline task. */
export const intakeAny = new IntakeAny();
