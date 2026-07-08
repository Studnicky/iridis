import { ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RgbInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

type RgbInput = RgbInterfaceType & {
  'a'?: number;
};

function isRgbInput(v: unknown): v is RgbInput {
  if (typeof v !== 'object' || v === null) {return false;}
  const o = v as Record<string, unknown>;
  return typeof o.r === 'number'
    && typeof o.g === 'number'
    && typeof o.b === 'number';
}

/**
 * Intake task that converts `{r, g, b, a?}` objects into `ColorRecord`s.
 * Auto-detects whether components are 0..1 or 0..255 by checking the
 * maximum value, so callers can pass either CSS-style bytes or float
 * literals without flagging the unit. Entries that carry `h`, `l`, or
 * `c` keys are not RGB objects and cause a throw when used with the
 * strict `intake:rgb` task. Use `intake:any` for tolerant dispatch.
 */
class IntakeRgb implements TaskInterface {
  readonly 'name' = 'intake:rgb';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses {r,g,b,a?} in 0..1 or 0..255 (auto-detected by max value) into ColorRecord entries. Throws on non-RGB input.',
    'name':        'intake:rgb',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  };

  /**
   * Parses a single value as an RGB object. Throws when the input is not a
   * valid `{r,g,b}` object or carries keys from a different format (h/l/c).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterfaceType {
    if (!isRgbInput(raw)) {
      throw ValidationError.create({
        'message': 'intake:rgb — expected an {r,g,b} object',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedShape': '{r: number, g: number, b: number, a?: number}', 'receivedType': typeof raw },
          'message': 'input is not an RGB object',
          'path':    'raw'
        }]
      });
    }
    const o = raw as unknown as Record<string, unknown>;
    if (typeof o.h === 'number' || typeof o.l === 'number' || typeof o.c === 'number') {
      throw ValidationError.create({
        'message': 'intake:rgb — object has conflicting format keys',
        'path':    'raw',
        'violations': [{
          'details': { 'conflictingKeys': ['h', 'l', 'c'], 'reason': 'h/l/c indicate a different format (hsl/oklch/lab)' },
          'message': 'object carries keys from a different color format',
          'path':    'raw'
        }]
      });
    }

    let { b, g, r } = raw;
    const a = typeof raw.a === 'number' ? raw.a : 1;

    if (r > 1 || g > 1 || b > 1) {
      r = r / 255;
      g = g / 255;
      b = b / 255;
    }

    const alpha = a > 1 ? a / 255 : a;
    return colorRecordFactory.fromRgb(r, g, b, { 'alpha': alpha });
  }

  /**
   * Wraps {@link IntakeRgb.parse} so the dispatch loop in
   * {@link IntakeRgb.run} does not carry a try/catch in its body (V8
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
          'message': `intake:rgb — entry at index ${i} is not an RGB object`,
          'path':    `input.colors[${i}]`,
          'violations': [{
            'details': {
              'expectedShape': '{r: 0..1 or 0..255, g: 0..1 or 0..255, b: 0..1 or 0..255, a?: number}',
              'index':         i,
              'received':      JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match the RGB object shape',
            'path':    `input.colors[${i}]`
          }]
        });
      }
      state.colors.push(record);
      ctx.logger.debug(
        LogBody.create()
          .component('IntakeRgb')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Parsed rgb value')
          .context({ 'b': record.rgb.b, 'g': record.rgb.g, 'hex': record.hex, 'r': record.rgb.r })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `intake:rgb` pipeline task. */
export const intakeRgb = new IntakeRgb();
