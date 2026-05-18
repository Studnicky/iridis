import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface HslInput {
  'h': number;
  's': number;
  'l': number;
  'a'?: number;
}

function isHslInput(v: unknown): v is HslInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['h'] === 'number'
    && typeof o['s'] === 'number'
    && typeof o['l'] === 'number'
    && typeof o['r'] !== 'number'
    && typeof o['c'] !== 'number';
}

/**
 * Intake task that converts `{h, s, l, a?}` objects into `ColorRecord`s.
 * Auto-detects whether saturation/lightness are 0..1 or 0..100 by the
 * max-value heuristic, so both CSS-style and float literals work
 * without an explicit unit flag. Hue is taken in degrees and wrapped
 * to [0, 360) before conversion. Non-HSL input throws when using the
 * strict `intake:hsl` task. Use `intake:any` for tolerant dispatch.
 */
export class IntakeHsl implements TaskInterface {
  readonly 'name' = 'intake:hsl';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:hsl',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses {h,s,l,a?} (h: deg, s/l: 0..1 or 0..100) into ColorRecord entries. Throws on non-HSL input.',
  };

  /**
   * Parses a single value as an HSL object. Throws when the input is not a
   * valid `{h,s,l}` object or carries keys from a different format (r/c).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterface {
    if (!isHslInput(raw)) {
      throw new Error(`intake:hsl — expected {h,s,l} object, got ${typeof raw}`);
    }

    const { h, s, l } = raw;
    const a = typeof raw['a'] === 'number' ? raw['a'] : 1;
    const alpha = a > 1 ? a / 100 : a;
    const sat = s > 1 ? s / 100 : s;
    const lig = l > 1 ? l / 100 : l;

    return colorRecordFactory.fromHsl(h, sat, lig, clamp01.apply(alpha), 'hsl');
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      let record: ColorRecordInterface;
      try {
        record = this.parse(raw);
      } catch {
        throw new Error(
          `intake:hsl — entry at index ${i} is not an HSL object. ` +
          `Expected {h, s, l, a?} with h in degrees, s/l in 0..1 or 0..100. ` +
          `Got: ${JSON.stringify(raw)}`,
        );
      }
      const typed = raw as { h: number; s: number; l: number };
      state.colors.push(record);
      ctx.logger.debug('IntakeHsl', 'run', 'Parsed hsl value', {
        'h': typed.h, 's': typed.s, 'l': typed.l, 'hex': record.hex,
      });
    }
  }
}

/** Singleton instance registered as the `intake:hsl` pipeline task. */
export const intakeHsl = new IntakeHsl();
