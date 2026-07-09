import { ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorRecordInterfaceType,
  OklchInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

type OklchInput = OklchInterfaceType & {
  'a'?: number;
};

function isOklchInput(v: unknown): v is OklchInput {
  if (typeof v !== 'object' || v === null) {return false;}
  const o = v as Record<string, unknown>;
  return typeof o.l === 'number'
    && typeof o.c === 'number'
    && typeof o.h === 'number'
    && typeof o.r !== 'number'
    && typeof o.s !== 'number';
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
    'reads':       ['input.colors'],
    'writes':      ['colors']
  };

  /**
   * Parses a single value as an OKLCH object. Throws when the input is not a
   * valid `{l,c,h}` object or carries keys from a different format (r/s).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterfaceType {
    if (!isOklchInput(raw)) {
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
      const typed = raw as { 'c': number; 'h': number; 'l': number; };
      state.colors.push(record);
      ctx.logger.debug(
        LogBody.create()
          .component('IntakeOklch')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Parsed oklch value')
          .context({ 'c': typed.c, 'h': typed.h, 'hex': record.hex, 'l': typed.l })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `intake:oklch` pipeline task. */
export const intakeOklch = new IntakeOklch();
