import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface RgbInput {
  'r': number;
  'g': number;
  'b': number;
  'a'?: number;
}

function isRgbInput(v: unknown): v is RgbInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['r'] === 'number'
    && typeof o['g'] === 'number'
    && typeof o['b'] === 'number';
}

/**
 * Intake task that converts `{r, g, b, a?}` objects into `ColorRecord`s.
 * Auto-detects whether components are 0..1 or 0..255 by checking the
 * maximum value, so callers can pass either CSS-style bytes or float
 * literals without flagging the unit. Entries that carry `h`, `l`, or
 * `c` keys are not RGB objects and cause a throw when used with the
 * strict `intake:rgb` task. Use `intake:any` for tolerant dispatch.
 */
export class IntakeRgb implements TaskInterface {
  readonly 'name' = 'intake:rgb';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:rgb',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses {r,g,b,a?} in 0..1 or 0..255 (auto-detected by max value) into ColorRecord entries. Throws on non-RGB input.',
  };

  /**
   * Parses a single value as an RGB object. Throws when the input is not a
   * valid `{r,g,b}` object or carries keys from a different format (h/l/c).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterface {
    if (!isRgbInput(raw)) {
      throw new Error(`intake:rgb — expected {r,g,b} object, got ${typeof raw}`);
    }
    const o = raw as unknown as Record<string, unknown>;
    if (typeof o['h'] === 'number' || typeof o['l'] === 'number' || typeof o['c'] === 'number') {
      throw new Error(`intake:rgb — object has conflicting format keys (h/l/c indicate a different format)`);
    }

    let { r, g, b } = raw;
    const a = typeof raw['a'] === 'number' ? raw['a'] : 1;

    if (r > 1 || g > 1 || b > 1) {
      r = r / 255;
      g = g / 255;
      b = b / 255;
    }

    const alpha = a > 1 ? a / 255 : a;
    return colorRecordFactory.fromRgb(r, g, b, alpha);
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      let record: ColorRecordInterface;
      try {
        record = this.parse(raw);
      } catch {
        throw new Error(
          `intake:rgb — entry at index ${i} is not an RGB object. ` +
          `Expected {r, g, b, a?} with numeric channels (0..1 or 0..255). ` +
          `Got: ${JSON.stringify(raw)}`,
        );
      }
      state.colors.push(record);
      ctx.logger.debug('IntakeRgb', 'run', 'Parsed rgb value', {
        'r': record.rgb.r, 'g': record.rgb.g, 'b': record.rgb.b, 'hex': record.hex,
      });
    }
  }
}

/** Singleton instance registered as the `intake:rgb` pipeline task. */
export const intakeRgb = new IntakeRgb();
