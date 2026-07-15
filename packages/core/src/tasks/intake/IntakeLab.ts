import { ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

type LabInput = {
  'a': number;
  'b': number;
  'l': number;
};

function isLabInput(v: unknown): v is LabInput {
  if (typeof v !== 'object' || v === null) {return false;}
  const o = v as Record<string, unknown>;
  return typeof o.l === 'number' && Number.isFinite(o.l)
    && typeof o.a === 'number' && Number.isFinite(o.a)
    && typeof o.b === 'number' && Number.isFinite(o.b)
    && typeof o.r !== 'number'
    && typeof o.s !== 'number'
    && typeof o.c !== 'number'
    && typeof o.h !== 'number';
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
    if (v <= 0.0031308) {return 12.92 * v;}
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };

  r = linearToSrgb(r);
  g = linearToSrgb(g);
  bv = linearToSrgb(bv);

  return [
    clamp01.apply(r),
    clamp01.apply(g),
    clamp01.apply(bv)
  ];
}

/**
 * Intake task that consumes `{l, a, b}` CIE Lab literals (D65 white
 * point) and converts them through XYZ → linear sRGB → gamma-encoded
 * sRGB. The disambiguation guard rejects entries that also carry HSL
 * (`s`) or OKLCH (`c`, `h`) keys to avoid stealing them from those
 * intakes. Non-Lab input throws when using the strict `intake:lab`
 * task. Use `intake:any` for tolerant dispatch.
 */
class IntakeLab implements TaskInterface {
  readonly 'name' = 'intake:lab';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses {l,a,b} CIE Lab D65 into ColorRecord entries. Throws on non-Lab input.',
    'name':        'intake:lab',
    'phase':       undefined,
    'reads':       ['input.colors'],
    'requires':    undefined,
    'writes':      ['colors']
  };

  /**
   * Parses a single value as a CIE Lab object. Throws when the input is not
   * a valid `{l,a,b}` object or carries conflicting format keys.
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterfaceType {
    if (!isLabInput(raw)) {
      throw ValidationError.create({
        'message': 'intake:lab — expected an {l,a,b} object',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedShape': '{l: number, a: number, b: number} (no conflicting r/s/c/h keys)', 'receivedType': typeof raw },
          'message': 'input is not a CIE Lab object',
          'path':    'raw'
        }]
      });
    }

    const { a, b, l } = raw;
    const [r, g, bv] = labToRgb(l, a, b);
    return colorRecordFactory.fromRgb(r, g, bv, { 'sourceFormat': 'lab' });
  }

  /**
   * Parses a single entry, rethrowing with index/context on failure.
   * Extracted from {@link IntakeLab.run} so the loop body contains only
   * a function call, not a try-catch, per V8 optimization guidance.
   */
  private parseEntry(raw: unknown, index: number): ColorRecordInterfaceType {
    try {
      return this.parse(raw);
    } catch {
      throw ValidationError.create({
        'message': `intake:lab — entry at index ${index} is not a CIE Lab object`,
        'path':    `input.colors[${index}]`,
        'violations': [{
          'details': {
            'expectedShape': '{l, a, b} without conflicting format keys (r, s, c, h)',
            'index':         index,
            'received':      JSON.stringify(raw) ?? 'undefined'
          },
          'message': 'entry does not match the CIE Lab object shape',
          'path':    `input.colors[${index}]`
        }]
      });
    }
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      const record = this.parseEntry(raw, i);
      state.colors.push(record);
      ctx.logger.debug(
        LogBody.create()
          .component('IntakeLab')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Parsed lab value')
          .context({
            'a': (raw as { 'a': number }).a,
            'b': (raw as { 'b': number }).b,
            'hex': record.hex,
            'l': (raw as { 'l': number }).l
          })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `intake:lab` pipeline task. */
export const intakeLab = new IntakeLab();
