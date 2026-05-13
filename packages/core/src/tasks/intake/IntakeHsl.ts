import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { clamp01 } from '../../math/Clamp.ts';
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
 * to [0, 360) before conversion.
 */
export class IntakeHsl implements TaskInterface {
  readonly 'name' = 'intake:hsl';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:hsl',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses {h,s,l,a?} (h: deg, s/l: 0..1 or 0..100) into ColorRecord entries.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      if (!isHslInput(raw)) {
        continue;
      }

      const { h, s, l } = raw;
      const a = typeof raw['a'] === 'number' ? raw['a'] : 1;
      const alpha = a > 1 ? a / 100 : a;

      // Normalise 0–100 s/l to 0–1 before passing to hslToRgb.
      const sat = s > 1 ? s / 100 : s;
      const lig = l > 1 ? l / 100 : l;

      const record = colorRecordFactory.fromHsl(h, sat, lig, clamp01(alpha), 'hsl');

      state.colors.push(record);
      ctx.logger.debug('IntakeHsl', 'run', `Parsed hsl(${h},${s},${l}) → ${record.hex}`);
    }
  }
}

/** Singleton instance registered as the `intake:hsl` pipeline task. */
export const intakeHsl = new IntakeHsl();
