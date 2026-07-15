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

import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { isImagePixelInput }  from './IsImagePixelInput.ts';

class Hex {
  static normalize(raw: string): string {
    const s = raw.trim();
    const cleaned = s.startsWith('#') ? s.slice(1) : s;

    if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
      const r = cleaned[0]!;
      const g = cleaned[1]!;
      const b = cleaned[2]!;
      return `${r}${r}${g}${g}${b}${b}`;
    }

    if (/^[0-9a-fA-F]{4}$/.test(cleaned)) {
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
}

/**
 * Intake task that walks `state.input.colors` and converts every entry
 * matching a hex pattern (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, with
 * or without leading `#`) into a `ColorRecord`. Non-hex input throws so
 * callers that explicitly select `intake:hex` get strict format
 * enforcement. Use `intake:any` for tolerant multi-format dispatch.
 *
 * 4- and 8-digit alpha is preserved on the resulting record's `alpha`
 * field while the canonical `hex` is always 6 digits, matching the
 * iridis convention that alpha lives in its own slot.
 */
class IntakeHex implements TaskInterface {
  readonly 'name' = 'intake:hex';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses #RRGGBB, #RGB, #RGBA, and #RRGGBBAA hex strings into ColorRecord entries. Throws on non-hex input.',
    'name':        'intake:hex',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  };

  /**
   * Parses a single value as a hex color. Throws when the input is not a
   * valid hex string. Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterfaceType {
    if (typeof raw !== 'string') {
      throw ValidationError.create({
        'message': 'intake:hex — expected a string input',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedType': 'string', 'receivedType': typeof raw },
          'message': 'input is not a string',
          'path':    'raw'
        }]
      });
    }
    const trimmed = raw.trim();
    if (!trimmed.startsWith('#') && !/^[0-9a-fA-F]{3,8}$/.test(trimmed)) {
      throw ValidationError.create({
        'message': 'intake:hex — not a hex pattern',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedFormat': '#RGB, #RGBA, #RRGGBB, or #RRGGBBAA (with or without leading #)', 'received': trimmed },
          'message': 'value does not match hex pattern',
          'path':    'raw'
        }]
      });
    }
    const hex6 = Hex.normalize(trimmed);
    if (hex6 === '') {
      throw ValidationError.create({
        'message': 'intake:hex — could not normalise hex',
        'path':    'raw',
        'violations': [{
          'details': { 'received': trimmed },
          'message': 'value could not be normalised to a 3/4/6/8-digit hex string',
          'path':    'raw'
        }]
      });
    }
    const cleaned = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    let alpha = 1;
    if (cleaned.length === 8) {
      alpha = parseInt(cleaned.slice(6, 8), 16) / 255;
    } else if (cleaned.length === 4) {
      const a = cleaned[3]!;
      alpha = parseInt(`${a}${a}`, 16) / 255;
    }
    return colorRecordFactory.fromHex(`#${hex6}`, { 'alphaOverride': alpha });
  }

  /**
   * Wraps {@link IntakeHex.parse} so the dispatch loop in
   * {@link IntakeHex.run} does not carry a try/catch in its body (V8
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
      // ImageData entries are silently skipped: they are handled by intake:imagePixels.
      // All other non-hex entries (including objects like {r,g,b}) throw with position
      // info so callers using intake:hex standalone get strict format enforcement.
      if (isImagePixelInput(raw)) {
        ctx.logger.trace(
          LogBody.create()
            .component('IntakeHex')
            .operation('run')
            .status(LOG_STATUS.SKIPPED)
            .message('Skipping ImageData entry (handled by intake:imagePixels)')
            .context({ 'index': i })
            .build()
        );
        continue;
      }
      const record = this.#tryParse(raw);
      if (record === undefined) {
        throw ValidationError.create({
          'message': `intake:hex — entry at index ${i} is not a hex color`,
          'path':    `input.colors[${i}]`,
          'violations': [{
            'details': {
              'expectedFormat': '#RGB, #RGBA, #RRGGBB, or #RRGGBBAA (with or without leading #)',
              'index':          i,
              'received':       JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match a hex color format',
            'path':    `input.colors[${i}]`
          }]
        });
      }
      state.colors.push(record);
      ctx.logger.debug(
        LogBody.create()
          .component('IntakeHex')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Parsed hex value')
          .context({ 'hex': record.hex, 'raw': raw })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `intake:hex` pipeline task. */
export const intakeHex = new IntakeHex();
