import { ValidationError } from '@studnicky/errors/node';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorInputEntity } from '../../entities/ColorInputEntity.ts';
import type { ColorRecordInterfaceTypeEntity } from '../../entities/ColorRecordInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { HEX_PATTERNS }       from './constants/HexPatterns.ts';
import { IsImagePixelInput }  from './IsImagePixelInput.ts';

class Hex {
  static normalize(raw: string): string {
    const trimmed = raw.trim();
    const cleaned = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    let result = '';

    if (HEX_PATTERNS.DIGITS_3.test(cleaned) || HEX_PATTERNS.DIGITS_4.test(cleaned)) {
      const r = cleaned[0]!;
      const g = cleaned[1]!;
      const b = cleaned[2]!;
      result = `${r}${r}${g}${g}${b}${b}`;
    } else if (HEX_PATTERNS.DIGITS_6.test(cleaned)) {
      result = cleaned;
    } else if (HEX_PATTERNS.DIGITS_8.test(cleaned)) {
      result = cleaned.slice(0, 6);
    }

    return result;
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

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Parses #RRGGBB, #RGB, #RGBA, and #RRGGBBAA hex strings into ColorRecord entries. Throws on non-hex input.',
    'name':        'intake:hex',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  });

  /**
   * Parses a single value as a hex color. Throws when the input is not a
   * valid hex string. Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: ColorInputEntity.Type): ColorRecordInterfaceTypeEntity.Type {
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
    if (!trimmed.startsWith('#') && !HEX_PATTERNS.DIGITS_3_TO_8.test(trimmed)) {
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
    const result = colorRecordFactory.fromHex(`#${hex6}`, { 'alphaOverride': alpha });
    return result;
  }

  /**
   * Wraps {@link IntakeHex.parse} so the dispatch loop in
   * {@link IntakeHex.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw: ColorInputEntity.Type): ColorRecordInterfaceTypeEntity.Type | undefined {
    try {
      const result = this.parse(raw);
      return result;
    } catch {
      return undefined;
    }
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i += 1) {
      const raw = state.input.colors[i];
      if (raw === undefined) {
        throw ValidationError.create({
          'message': `intake:hex — entry at index ${i} is not a hex color`,
          'path':    `input.colors[${i}]`,
          'violations': [{
            'details': { 'index': i },
            'message': 'entry is absent',
            'path':    `input.colors[${i}]`
          }]
        });
      }
      // ImageData entries are silently skipped: they are handled by intake:imagePixels.
      // All other non-hex entries (including objects like {r,g,b}) throw with position
      // info so callers using intake:hex standalone get strict format enforcement.
      if (IsImagePixelInput.check(raw)) {
        context.logger.trace(
          LogBody.create({
            'component': 'IntakeHex',
            'context': { 'index': i },
            'message': 'Skipping ImageData entry (handled by intake:imagePixels)',
            'operation': 'run',
            'status': LOG_STATUS.SKIPPED
          })
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
      context.logger.debug(
        LogBody.create({
          'component': 'IntakeHex',
          'context': { 'hex': record.hex, 'raw': raw },
          'message': 'Parsed hex value',
          'operation': 'run',
          'status': LOG_STATUS.SUCCESS
        })
      );
    }
  }
}

/** Singleton instance registered as the `intake:hex` pipeline task. */
export const intakeHex = new IntakeHex();
