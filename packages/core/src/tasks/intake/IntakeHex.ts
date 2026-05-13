import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

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
 * without leading `#`) into a `ColorRecord`. Non-string entries and
 * malformed hex are skipped silently — the dispatcher (`IntakeAny`)
 * relies on each handler being a no-op for inputs it doesn't own.
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
    'description': 'Parses #RRGGBB, #RGB, and 8-digit hex strings into ColorRecord entries.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      if (typeof raw !== 'string') {
        continue;
      }
      const trimmed = raw.trim();
      if (!trimmed.startsWith('#') && !/^[0-9a-fA-F]{3,8}$/.test(trimmed)) {
        continue;
      }
      const hex6 = normalizeHex(trimmed);
      if (!hex6) {
        ctx.logger.warn('IntakeHex', 'run', `Skipping unrecognized hex value: ${raw}`);
        continue;
      }
      const alpha = ((): number => {
        const cleaned = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
        if (cleaned.length === 8) {
          return parseInt(cleaned.slice(6, 8), 16) / 255;
        }
        return 1;
      })();

      const record: ColorRecordInterface = colorRecordFactory.fromHex(`#${hex6}`, alpha);

      state.colors.push(record);
      ctx.logger.debug('IntakeHex', 'run', `Parsed hex ${raw} → ${record.hex}`);
    }
  }
}

/** Singleton instance registered as the `intake:hex` pipeline task. */
export const intakeHex = new IntakeHex();
