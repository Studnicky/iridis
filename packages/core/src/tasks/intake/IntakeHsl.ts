import { ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { ColorRecordInterfaceType } from '../../types/color.ts';
import type {
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/pipeline.ts';
import type { PaletteStateInterface } from '../../types/state.ts';

import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

type HslInput = {
  'a'?: number;
  'h': number;
  'l': number;
  's': number;
};

function isHslInput(v: unknown): v is HslInput {
  if (typeof v !== 'object' || v === null) {return false;}
  const o = v as Record<string, unknown>;
  return typeof o.h === 'number'
    && typeof o.s === 'number'
    && typeof o.l === 'number'
    && typeof o.r !== 'number'
    && typeof o.c !== 'number';
}

/**
 * Intake task that converts `{h, s, l, a?}` objects into `ColorRecord`s.
 * Auto-detects whether saturation/lightness are 0..1 or 0..100 by the
 * max-value heuristic, so both CSS-style and float literals work
 * without an explicit unit flag. Hue is taken in degrees and wrapped
 * to [0, 360) before conversion. Non-HSL input throws when using the
 * strict `intake:hsl` task. Use `intake:any` for tolerant dispatch.
 */
class IntakeHsl implements TaskInterface {
  readonly 'name' = 'intake:hsl';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses {h,s,l,a?} (h: deg, s/l: 0..1 or 0..100) into ColorRecord entries. Throws on non-HSL input.',
    'name':        'intake:hsl',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  };

  /**
   * Parses a single value as an HSL object. Throws when the input is not a
   * valid `{h,s,l}` object or carries keys from a different format (r/c).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterfaceType {
    if (!isHslInput(raw)) {
      throw ValidationError.create({
        'message': 'intake:hsl — expected an {h,s,l} object',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedShape': '{h: number (deg), s: number, l: number, a?: number}', 'receivedType': typeof raw },
          'message': 'input is not an HSL object',
          'path':    'raw'
        }]
      });
    }

    const { h, l, s } = raw;
    const a = typeof raw.a === 'number' ? raw.a : 1;
    const alpha = a > 1 ? a / 100 : a;
    const sat = s > 1 ? s / 100 : s;
    const lig = l > 1 ? l / 100 : l;

    return colorRecordFactory.fromHsl(h, sat, lig, { 'alpha': clamp01.apply(alpha), 'sourceFormat': 'hsl' });
  }

  /**
   * Wraps {@link IntakeHsl.parse} so the dispatch loop in
   * {@link IntakeHsl.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw: unknown): ColorRecordInterfaceType | undefined {
    try {
      return this.parse(raw);
    } catch {
      return undefined;
    }
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      const record = this.#tryParse(raw);
      if (record === undefined) {
        throw ValidationError.create({
          'message': `intake:hsl — entry at index ${i} is not an HSL object`,
          'path':    `input.colors[${i}]`,
          'violations': [{
            'details': {
              'expectedShape': '{h: degrees, s: 0..1 or 0..100, l: 0..1 or 0..100, a?: number}',
              'index':         i,
              'received':      JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match the HSL object shape',
            'path':    `input.colors[${i}]`
          }]
        });
      }
      const typed = raw as { 'h': number; 'l': number; 's': number; };
      state.colors.push(record);
      ctx.logger.debug(
        LogBody.create()
          .component('IntakeHsl')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Parsed hsl value')
          .context({ 'h': typed.h, 'hex': record.hex, 'l': typed.l, 's': typed.s })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `intake:hsl` pipeline task. */
export const intakeHsl = new IntakeHsl();
