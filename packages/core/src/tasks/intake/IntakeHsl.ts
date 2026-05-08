import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';
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

function hslToRgbComponents(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const sat = s > 1 ? s / 100 : s;
  const lig = l > 1 ? l / 100 : l;

  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = lig - c / 2;

  let r = 0, g = 0, b = 0;

  if (hue < 60)      { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else                { r = c; g = 0; b = x; }

  return [r + m, g + m, b + m];
}

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

      const [r, g, b] = hslToRgbComponents(h, s, l);
      const base = colorRecordFactory.fromRgb(
        Math.max(0, Math.min(1, r)),
        Math.max(0, Math.min(1, g)),
        Math.max(0, Math.min(1, b)),
        Math.max(0, Math.min(1, alpha)),
      );
      const record = { ...base, 'sourceFormat': 'hsl' as const };

      state.colors.push(record);
      ctx.logger.debug('IntakeHsl', 'run', `Parsed hsl(${h},${s},${l}) → ${record.hex}`);
    }
  }
}

export const intakeHsl = new IntakeHsl();
