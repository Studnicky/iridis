import { ValidationError } from '@studnicky/errors/node';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorInputEntity } from '../../entities/ColorInputEntity.ts';
import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { HslInputEntity } from '../../entities/HslInputEntity.ts';
import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

class HslInputBoundary {
  static intake(value: ColorInputEntity.Type): HslInputEntity.Type | undefined {
    try {
      const result = HslInputEntity.intake(value);
      return result;
    } catch {
      return undefined;
    }
  }
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

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Parses {h,s,l,a?} (h: deg, s/l: 0..1 or 0..100) into ColorRecord entries. Throws on non-HSL input.',
    'name':        'intake:hsl',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  });

  /**
   * Parses a single value as an HSL object. Throws when the input is not a
   * valid `{h,s,l}` object or carries keys from a different format (r/c).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: ColorInputEntity.Type): ColorRecordEntity.Type {
    const input = HslInputBoundary.intake(raw);
    if (input === undefined) {
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

    const { h, l, s } = input;
    const a = input.a ?? 1;
    const alpha = a > 1 ? a / 100 : a;
    const sat = s > 1 ? s / 100 : s;
    const lig = l > 1 ? l / 100 : l;

    const result = colorRecordFactory.fromHsl(h, sat, lig, { 'alpha': clamp01.apply(alpha), 'sourceFormat': 'hsl' });
    return result;
  }

  /**
   * Wraps {@link IntakeHsl.parse} so the dispatch loop in
   * {@link IntakeHsl.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw: ColorInputEntity.Type): ColorRecordEntity.Type | undefined {
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
          'message': `intake:hsl — entry at index ${i} is not an HSL object`,
          'path':    `input.colors[${i}]`,
          'violations': [{
            'details': { 'index': i },
            'message': 'entry is absent',
            'path':    `input.colors[${i}]`
          }]
        });
      }
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
      const typed = HslInputBoundary.intake(raw);
      state.colors.push(record);
      context.logger.debug(
        LogBody.create({
          'component': 'IntakeHsl',
          'context': { 'h': typed?.h, 'hex': record.hex, 'l': typed?.l, 's': typed?.s },
          'message': 'Parsed hsl value',
          'operation': 'run',
          'status': LOG_STATUS.SUCCESS
        })
      );
    }
  }
}

/** Singleton instance registered as the `intake:hsl` pipeline task. */
export const intakeHsl = new IntakeHsl();
