import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface OklchInput {
  'l': number;
  'c': number;
  'h': number;
  'a'?: number;
}

function isOklchInput(v: unknown): v is OklchInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['l'] === 'number'
    && typeof o['c'] === 'number'
    && typeof o['h'] === 'number'
    && typeof o['r'] !== 'number'
    && typeof o['s'] !== 'number';
}

/**
 * Intake task that consumes `{l, c, h, a?}` OKLCH literals where `l` is
 * 0..1, `c` is 0..0.5, and `h` is degrees. This is the lossless intake:
 * every other format eventually round-trips through OKLCH, so passing
 * iridis-native coordinates skips a conversion step. Non-OKLCH input
 * throws when using the strict `intake:oklch` task. Use `intake:any`
 * for tolerant dispatch.
 */
export class IntakeOklch implements TaskInterface {
  readonly 'name' = 'intake:oklch';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:oklch',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses {l,c,h,a?} OKLCH (l: 0..1, c: 0..0.5, h: 0..360) into ColorRecord entries. Throws on non-OKLCH input.',
  };

  /**
   * Parses a single value as an OKLCH object. Throws when the input is not a
   * valid `{l,c,h}` object or carries keys from a different format (r/s).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterface {
    if (!isOklchInput(raw)) {
      throw new Error(`intake:oklch — expected {l,c,h} object, got ${typeof raw}`);
    }

    const { l, c, h } = raw;
    const a = typeof raw['a'] === 'number' ? raw['a'] : 1;
    return colorRecordFactory.fromOklch(l, c, h, a);
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      let record: ColorRecordInterface;
      try {
        record = this.parse(raw);
      } catch {
        throw new Error(
          `intake:oklch — entry at index ${i} is not an OKLCH object. ` +
          `Expected {l, c, h, a?} with l: 0..1, c: 0..0.5, h: 0..360. ` +
          `Got: ${JSON.stringify(raw)}`,
        );
      }
      const typed = raw as { l: number; c: number; h: number };
      state.colors.push(record);
      ctx.logger.debug('IntakeOklch', 'run', 'Parsed oklch value', {
        'l': typed.l, 'c': typed.c, 'h': typed.h, 'hex': record.hex,
      });
    }
  }
}

/** Singleton instance registered as the `intake:oklch` pipeline task. */
export const intakeOklch = new IntakeOklch();
