import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface ImagePixelInput {
  'data':   Uint8ClampedArray;
  'width':  number;
  'height': number;
}

function isImagePixelInput(v: unknown): v is ImagePixelInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return o['data'] instanceof Uint8ClampedArray
    && typeof o['width'] === 'number'
    && typeof o['height'] === 'number';
}

export class IntakeImagePixels implements TaskInterface {
  readonly 'name' = 'intake:imagePixels';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:imagePixels',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses ImageData or {data: Uint8ClampedArray, width, height} and pushes non-transparent pixels.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      if (!isImagePixelInput(raw)) {
        continue;
      }

      const { data, width, height } = raw;
      const pixelCount = width * height;
      let pushed = 0;

      for (let i = 0; i < pixelCount; i++) {
        const offset = i * 4;
        const alpha = data[offset + 3];
        if (alpha === undefined || alpha === 0) {
          continue;
        }

        const r = (data[offset] ?? 0) / 255;
        const g = (data[offset + 1] ?? 0) / 255;
        const b = (data[offset + 2] ?? 0) / 255;
        const a = alpha / 255;

        const base = colorRecordFactory.fromRgb(r, g, b, a);
        const record = { ...base, 'sourceFormat': 'imagePixel' as const };

        state.colors.push(record);
        pushed++;
      }

      ctx.logger.debug(
        'IntakeImagePixels',
        'run',
        `Pushed ${pushed} pixels from ${width}x${height} image`,
      );
    }
  }
}

export const intakeImagePixels = new IntakeImagePixels();
