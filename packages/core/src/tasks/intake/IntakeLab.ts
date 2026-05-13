import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { clamp01 } from '../../math/Clamp.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface LabInput {
  'l': number;
  'a': number;
  'b': number;
}

function isLabInput(v: unknown): v is LabInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['l'] === 'number'
    && typeof o['a'] === 'number'
    && typeof o['b'] === 'number'
    && typeof o['r'] !== 'number'
    && typeof o['s'] !== 'number'
    && typeof o['c'] !== 'number'
    && typeof o['h'] !== 'number';
}

function labToRgb(l: number, a: number, b: number): [number, number, number] {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const eps = 0.008856;
  const kap = 903.3;

  const xw = 0.95047;
  const yw = 1.00000;
  const zw = 1.08883;

  const xr = Math.pow(fx, 3) > eps ? Math.pow(fx, 3) : (116 * fx - 16) / kap;
  const yr = l > kap * eps ? Math.pow((l + 16) / 116, 3) : l / kap;
  const zr = Math.pow(fz, 3) > eps ? Math.pow(fz, 3) : (116 * fz - 16) / kap;

  const x = xr * xw;
  const y = yr * yw;
  const z = zr * zw;

  let r =  3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  let bv =  0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  const linearToSrgb = (v: number): number => {
    if (v <= 0.0031308) return 12.92 * v;
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };

  r = linearToSrgb(r);
  g = linearToSrgb(g);
  bv = linearToSrgb(bv);

  return [
    clamp01(r),
    clamp01(g),
    clamp01(bv),
  ];
}

/**
 * Intake task that consumes `{l, a, b}` CIE Lab literals (D65 white
 * point) and converts them through XYZ → linear sRGB → gamma-encoded
 * sRGB. The disambiguation guard rejects entries that also carry HSL
 * (`s`) or OKLCH (`c`, `h`) keys to avoid stealing them from those
 * intakes.
 */
export class IntakeLab implements TaskInterface {
  readonly 'name' = 'intake:lab';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:lab',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses {l,a,b} CIE Lab D65 into ColorRecord entries.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      if (!isLabInput(raw)) {
        continue;
      }

      const { l, a, b } = raw;
      const [r, g, bv] = labToRgb(l, a, b);

      const base = colorRecordFactory.fromRgb(r, g, bv, 1);
      const record = { ...base, 'sourceFormat': 'lab' as const };

      state.colors.push(record);
      ctx.logger.debug('IntakeLab', 'run', `Parsed lab(${l},${a},${b}) → ${record.hex}`);
    }
  }
}

/** Singleton instance registered as the `intake:lab` pipeline task. */
export const intakeLab = new IntakeLab();
