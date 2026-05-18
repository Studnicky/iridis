import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { isImagePixelInput }  from './IntakeImagePixels.ts';

function normalizeHex(raw: string): string {
  const s = raw.trim();
  const cleaned = s.startsWith('#') ? s.slice(1) : s;

  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[0]!;
    const g = cleaned[1]!;
    const b = cleaned[2]!;
    return `${r}${r}${g}${g}${b}${b}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^[0-9a-fA-F]{8}$/.test(cleaned)) {
    return cleaned.slice(0, 6);
  }

  return '';
}

/**
 * Intake task that walks `state.input.colors` and converts every entry
 * matching a hex pattern (`#rgb`, `#rrggbb`, `#rrggbbaa`, with or
 * without leading `#`) into a `ColorRecord`. Non-hex input throws so
 * callers that explicitly select `intake:hex` get strict format
 * enforcement. Use `intake:any` for tolerant multi-format dispatch.
 *
 * 8-digit alpha is preserved on the resulting record's `alpha` field
 * while the canonical `hex` is always 6 digits, matching the iridis
 * convention that alpha lives in its own slot.
 */
export class IntakeHex implements TaskInterface {
  readonly 'name' = 'intake:hex';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:hex',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses #RRGGBB, #RGB, and 8-digit hex strings into ColorRecord entries. Throws on non-hex input.',
  };

  /**
   * Parses a single value as a hex color. Throws when the input is not a
   * valid hex string. Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterface {
    if (typeof raw !== 'string') {
      throw new Error(`intake:hex — expected a string, got ${typeof raw}`);
    }
    const trimmed = raw.trim();
    if (!trimmed.startsWith('#') && !/^[0-9a-fA-F]{3,8}$/.test(trimmed)) {
      throw new Error(`intake:hex — not a hex pattern: "${trimmed}"`);
    }
    const hex6 = normalizeHex(trimmed);
    if (!hex6) {
      throw new Error(`intake:hex — could not normalise hex: "${trimmed}"`);
    }
    const cleaned = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    const alpha = cleaned.length === 8 ? parseInt(cleaned.slice(6, 8), 16) / 255 : 1;
    return colorRecordFactory.fromHex(`#${hex6}`, alpha);
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      // ImageData entries are silently skipped: they are handled by intake:imagePixels.
      // All other non-hex entries (including objects like {r,g,b}) throw with position
      // info so callers using intake:hex standalone get strict format enforcement.
      if (isImagePixelInput(raw)) {
        ctx.logger.trace('IntakeHex', 'run', 'Skipping ImageData entry (handled by intake:imagePixels)', { index: i });
        continue;
      }
      let record: ColorRecordInterface;
      try {
        record = this.parse(raw);
      } catch {
        throw new Error(
          `intake:hex — entry at index ${i} is not a hex color. ` +
          `Expected #RGB, #RRGGBB, or #RRGGBBAA (with or without leading #). ` +
          `Got: ${JSON.stringify(raw)}`,
        );
      }
      state.colors.push(record);
      ctx.logger.debug('IntakeHex', 'run', 'Parsed hex value', { 'raw': raw, 'hex': record.hex });
    }
  }
}

/** Singleton instance registered as the `intake:hex` pipeline task. */
export const intakeHex = new IntakeHex();
