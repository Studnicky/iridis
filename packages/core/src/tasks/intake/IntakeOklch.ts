import type { JsonValueType } from '@studnicky/types';

import { ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { OklchInputEntity } from '../../entities/OklchInputEntity.ts';
import type { RawImagePixelInputInterface } from '../../interfaces/RawImagePixelInputInterface.ts';
import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

class OklchInputGuard {
  static check(value: JsonValueType | RawImagePixelInputInterface): value is OklchInputEntity.Type {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {return false;}
    if (!('l' in value) || !('c' in value) || !('h' in value)) {return false;}
    return typeof value.l === 'number' && Number.isFinite(value.l)
      && typeof value.c === 'number' && Number.isFinite(value.c)
      && typeof value.h === 'number' && Number.isFinite(value.h)
      && !('r' in value && typeof value.r === 'number')
      && !('s' in value && typeof value.s === 'number');
  }
}

/**
 * Intake task that consumes `{l, c, h, a?}` OKLCH literals where `l` is
 * 0..1, `c` is 0..0.5, and `h` is degrees. This is the lossless intake:
 * every other format eventually round-trips through OKLCH, so passing
 * iridis-native coordinates skips a conversion step. Non-OKLCH input
 * throws when using the strict `intake:oklch` task. Use `intake:any`
 * for tolerant dispatch.
 */
class IntakeOklch implements TaskInterface {
  readonly 'name' = 'intake:oklch';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses {l,c,h,a?} OKLCH (l: 0..1, c: 0..0.5, h: 0..360) into ColorRecord entries. Throws on non-OKLCH input.',
    'name':        'intake:oklch',
    'phase':       undefined,
    'reads':       ['input.colors'],
    'requires':    undefined,
    'writes':      ['colors']
  };

  /**
   * Parses a single value as an OKLCH object. Throws when the input is not a
   * valid `{l,c,h}` object or carries keys from a different format (r/s).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: JsonValueType | RawImagePixelInputInterface): ColorRecordInterfaceType {
    if (!OklchInputGuard.check(raw)) {
      throw ValidationError.create({
        'message': 'intake:oklch — expected an {l,c,h} object',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedShape': '{l: number, c: number, h: number, a?: number}', 'receivedType': typeof raw },
          'message': 'input is not an OKLCH object',
          'path':    'raw'
        }]
      });
    }

    const { c, h, l } = raw;
    const a = typeof raw.a === 'number' ? raw.a : 1;
    return colorRecordFactory.fromOklch(l, c, h, { 'alpha': a });
  }

  /**
   * Wraps {@link IntakeOklch.parse} so the dispatch loop in
   * {@link IntakeOklch.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw: JsonValueType | RawImagePixelInputInterface): ColorRecordInterfaceType | undefined {
    try {
      return this.parse(raw);
    } catch {
      return undefined;
    }
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    for (const [i, raw] of state.input.colors.entries()) {
      const record = this.#tryParse(raw);
      if (record === undefined) {
        throw ValidationError.create({
          'message': `intake:oklch — entry at index ${i} is not an OKLCH object`,
          'path':    `input.colors[${i}]`,
          'violations': [{
            'details': {
              'expectedShape': '{l: 0..1, c: 0..0.5, h: 0..360, a?: number}',
              'index':         i,
              'received':      JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match the OKLCH object shape',
            'path':    `input.colors[${i}]`
          }]
        });
      }
      const typed = OklchInputGuard.check(raw) ? raw : undefined;
      state.colors.push(record);
      context.logger.debug(
        LogBody.create()
          .component('IntakeOklch')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Parsed oklch value')
          .context({ 'c': typed?.c, 'h': typed?.h, 'hex': record.hex, 'l': typed?.l })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `intake:oklch` pipeline task. */
export const intakeOklch = new IntakeOklch();
