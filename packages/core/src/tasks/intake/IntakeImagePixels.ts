import { ValidationError } from '@studnicky/errors/node';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorInputEntity } from '../../entities/ColorInputEntity.ts';
import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { RawImagePixelInputInterface } from '../../interfaces/RawImagePixelInputInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { IsImagePixelInput } from './IsImagePixelInput.ts';

/**
 * Intake task for ImageData-shaped inputs. It pushes one ColorRecord per fully
 * or partially opaque pixel and drops transparent pixels before clustering.
 */
class IntakeImagePixels implements TaskInterface {
  readonly 'name' = 'intake:imagePixels';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Parses ImageData or {data: Uint8ClampedArray, width, height} and pushes non-transparent pixels. Throws on non-image input.',
    'name':        'intake:imagePixels',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  });

  /**
   * Parses an ImageData entry and returns its first non-transparent pixel as a
   * format-match sentinel for IntakeAny.
   */
  parse(raw: ColorInputEntity.Type | RawImagePixelInputInterface): ColorRecordEntity.Type {
    if (!IsImagePixelInput.check(raw)) {
      throw ValidationError.create({
        'message': 'intake:imagePixels — expected an ImageData-shaped object',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedShape': '{data: Uint8ClampedArray, width: number, height: number}', 'receivedType': typeof raw },
          'message': 'input is not an ImageData-shaped object',
          'path':    'raw'
        }]
      });
    }
    const { data } = raw;
    const pixelCount = raw.width * raw.height;
    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 4;
      const alpha = data[offset + 3];
      if (alpha === undefined || alpha === 0) {
        continue;
      }
      const red = (data[offset] ?? 0) / 255;
      const green = (data[offset + 1] ?? 0) / 255;
      const blue = (data[offset + 2] ?? 0) / 255;
      const result = colorRecordFactory.fromRgb(red, green, blue, { 'alpha': alpha / 255, 'sourceFormat': 'imagePixel' });
      return result;
    }
    throw ValidationError.create({
      'message': 'intake:imagePixels — image has no non-transparent pixels',
      'path':    'raw',
      'violations': [{
        'details': { 'height': raw.height, 'pixelCount': pixelCount, 'width': raw.width },
        'message': 'every pixel in the image has alpha 0',
        'path':    'raw'
      }]
    });
  }

  /** Pushes every non-transparent pixel from an ImageData entry into colors. */
  pushAllPixels(raw: ColorInputEntity.Type | RawImagePixelInputInterface, state: PaletteStateInterface, context: PipelineContextInterface): void {
    if (!IsImagePixelInput.check(raw)) {
      return;
    }
    const { data, height, width } = raw;
    const pixelCount = width * height;
    let pushed = 0;

    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 4;
      const alpha = data[offset + 3];
      if (alpha === undefined || alpha === 0) {
        continue;
      }
      const red = (data[offset] ?? 0) / 255;
      const green = (data[offset + 1] ?? 0) / 255;
      const blue = (data[offset + 2] ?? 0) / 255;
      state.colors.push(colorRecordFactory.fromRgb(red, green, blue, { 'alpha': alpha / 255, 'sourceFormat': 'imagePixel' }));
      pushed += 1;
    }

    context.logger.debug(
      LogBody.create({
        'component': 'IntakeImagePixels',
        'context': {
          'height': height,
          'pushed': pushed,
          'width':  width
        },
        'message': 'Pushed pixels from image',
        'operation': 'pushAllPixels',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const inputColors = state.input.colors;
    for (let index = 0; index < inputColors.length; index += 1) {
      const raw = inputColors[index];
      if (raw === undefined || !IsImagePixelInput.check(raw)) {
        context.logger.trace(
          LogBody.create({
            'component': 'IntakeImagePixels',
            'context': { 'index': index },
            'message': 'Skipping non-image entry',
            'operation': 'run',
            'status': LOG_STATUS.SKIPPED
          })
        );
        continue;
      }
      this.pushAllPixels(raw, state, context);
    }
  }
}

/** Singleton instance registered as the intake:imagePixels pipeline task. */
export const intakeImagePixels = new IntakeImagePixels();
