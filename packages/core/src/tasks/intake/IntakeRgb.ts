import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface RgbInput {
  'r': number;
  'g': number;
  'b': number;
  'a'?: number;
}

function isRgbInput(v: unknown): v is RgbInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['r'] === 'number'
    && typeof o['g'] === 'number'
    && typeof o['b'] === 'number';
}

/**
 * Intake task that converts `{r, g, b, a?}` objects into `ColorRecord`s.
 * Auto-detects whether components are 0..1 or 0..255 by checking the
 * maximum value, so callers can pass either CSS-style bytes or float
 * literals without flagging the unit. Entries that look like other
 * formats (presence of `h`, `l`, or `c` keys) are skipped to avoid
 * conflicting with the HSL/OKLCH intakes.
 */
export class IntakeRgb implements TaskInterface {
  readonly 'name' = 'intake:rgb';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:rgb',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses {r,g,b,a?} in 0..1 or 0..255 (auto-detected by max value) into ColorRecord entries.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      if (!isRgbInput(raw)) {
        continue;
      }
      const o = raw as unknown as Record<string, unknown>;
      if (typeof o['h'] === 'number' || typeof o['l'] === 'number' || typeof o['c'] === 'number') {
        continue;
      }

      let { r, g, b } = raw;
      const a = typeof raw['a'] === 'number' ? raw['a'] : 1;

      if (r > 1 || g > 1 || b > 1) {
        r = r / 255;
        g = g / 255;
        b = b / 255;
      }

      const alpha = a > 1 ? a / 255 : a;
      const record = colorRecordFactory.fromRgb(
        Math.max(0, Math.min(1, r)),
        Math.max(0, Math.min(1, g)),
        Math.max(0, Math.min(1, b)),
        Math.max(0, Math.min(1, alpha)),
      );

      state.colors.push(record);
      ctx.logger.debug('IntakeRgb', 'run', `Parsed rgb(${r},${g},${b}) → ${record.hex}`);
    }
  }
}

/** Singleton instance registered as the `intake:rgb` pipeline task. */
export const intakeRgb = new IntakeRgb();
