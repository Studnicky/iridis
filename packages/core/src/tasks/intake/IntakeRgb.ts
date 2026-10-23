import { ValidationError } from '@studnicky/errors/node';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorInputEntity } from '../../entities/ColorInputEntity.ts';
import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { RawImagePixelInputInterface } from '../../interfaces/RawImagePixelInputInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { RgbInputEntity } from '../../entities/RgbInputEntity.ts';
import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

const RGB_BYTE_SCALE_THRESHOLD = 2;

/** Strict intake task for {r,g,b,a?} float or byte RGB literals. */
class IntakeRgb implements TaskInterface {
  readonly 'name' = 'intake:rgb';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Parses {r,g,b,a?} in 0..1 or 0..255 (auto-detected by max value) into ColorRecord entries. Throws on non-RGB input.',
    'name':        'intake:rgb',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  });

  parse(raw: ColorInputEntity.Type | RawImagePixelInputInterface): ColorRecordEntity.Type {
    let input: RgbInputEntity.Type;
    try {
      input = RgbInputEntity.intake(raw);
    } catch {
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

    let { b, g, r } = input;
    if (r > RGB_BYTE_SCALE_THRESHOLD || g > RGB_BYTE_SCALE_THRESHOLD || b > RGB_BYTE_SCALE_THRESHOLD) {
      r /= 255;
      g /= 255;
      b /= 255;
    }

    const alpha = (input.a ?? 1) > 1 ? (input.a ?? 1) / 255 : (input.a ?? 1);
    const result = colorRecordFactory.fromRgb(r, g, b, { 'alpha': alpha });
    return result;
  }

  #tryParse(raw: ColorInputEntity.Type | RawImagePixelInputInterface): ColorRecordEntity.Type | undefined {
    try {
      const result = this.parse(raw);
      return result;
    } catch {
      return undefined;
    }
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const inputColors = state.input.colors;
    for (let index = 0; index < inputColors.length; index += 1) {
      const raw = inputColors[index];
      if (raw === undefined) {
        continue;
      }
      const record = this.#tryParse(raw);
      if (record === undefined) {
        throw ValidationError.create({
          'message': `intake:rgb — entry at index ${index} is not an RGB object`,
          'path':    `input.colors[${index}]`,
          'violations': [{
            'details': {
              'expectedShape': '{r: 0..1 or 0..255, g: 0..1 or 0..255, b: 0..1 or 0..255, a?: number}',
              'index':         index,
              'received':      JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match the RGB object shape',
            'path':    `input.colors[${index}]`
          }]
        });
      }
      state.colors.push(record);
      context.logger.debug(
        LogBody.create({
          'component': 'IntakeRgb',
          'context': { 'b': record.rgb.b, 'g': record.rgb.g, 'hex': record.hex, 'r': record.rgb.r },
          'message': 'Parsed rgb value',
          'operation': 'run',
          'status': LOG_STATUS.SUCCESS
        })
      );
    }
  }
}

/** Singleton instance registered as the intake:rgb pipeline task. */
export const intakeRgb = new IntakeRgb();
