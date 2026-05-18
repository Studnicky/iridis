import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface ImagePixelInput {
  'data':   Uint8ClampedArray;
  'width':  number;
  'height': number;
}

export function isImagePixelInput(v: unknown): v is ImagePixelInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return o['data'] instanceof Uint8ClampedArray
    && typeof o['width'] === 'number'
    && typeof o['height'] === 'number';
}

/**
 * Intake task for `ImageData`-shaped inputs (`{data: Uint8ClampedArray,
 * width, height}`, the canvas API's pixel buffer). Pushes one
 * `ColorRecord` per fully or partially opaque pixel; transparent
 * pixels are dropped so an alpha-channel mask doesn't bias clustering.
 *
 * Image inputs typically blow past `clamp:count`'s 64-color default;
 * pair this intake with `clamp:count` (or a smaller `maxColors`) so
 * downstream tasks aren't dragged down by tens of thousands of pixels.
 *
 * Non-ImageData input throws when using the strict `intake:imagePixels`
 * task. Use `intake:any` for tolerant dispatch.
 */
export class IntakeImagePixels implements TaskInterface {
  readonly 'name' = 'intake:imagePixels';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:imagePixels',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses ImageData or {data: Uint8ClampedArray, width, height} and pushes non-transparent pixels. Throws on non-image input.',
  };

  /**
   * Parses a single value as an ImageData-shaped input, returning the first
   * non-transparent pixel as a format-match sentinel. Throws when the input
   * is not an `{data, width, height}` object or contains no opaque pixels.
   * Used by IntakeAny for format dispatch (via try/catch).
   * The full pixel set is pushed separately via {@link pushAllPixels}.
   */
  parse(raw: unknown): ColorRecordInterface {
    if (!isImagePixelInput(raw)) {
      throw new Error(`intake:imagePixels — expected {data: Uint8ClampedArray, width, height}, got ${typeof raw}`);
    }
    const { data } = raw;
    const pixelCount = raw.width * raw.height;
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4;
      const alpha = data[offset + 3];
      if (alpha === undefined || alpha === 0) {
        continue;
      }
      const r = (data[offset] ?? 0) / 255;
      const g = (data[offset + 1] ?? 0) / 255;
      const b = (data[offset + 2] ?? 0) / 255;
      return colorRecordFactory.fromRgb(r, g, b, alpha / 255, 'imagePixel');
    }
    // All pixels transparent — no opaque pixels to parse.
    throw new Error('intake:imagePixels — image has no non-transparent pixels');
  }

  /**
   * Pushes all non-transparent pixels from an ImageData entry into `colors`.
   * Called by `IntakeAny` after `isImagePixelInput` confirms the entry is an image.
   */
  pushAllPixels(
    raw: unknown,
    state: PaletteStateInterface,
    ctx: PipelineContextInterface,
  ): void {
    if (!isImagePixelInput(raw)) {
      return;
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
      state.colors.push(colorRecordFactory.fromRgb(r, g, b, alpha / 255, 'imagePixel'));
      pushed++;
    }

    ctx.logger.debug('IntakeImagePixels', 'pushAllPixels', 'Pushed pixels from image', {
      'pushed': pushed,
      'width':  width,
      'height': height,
    });
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      if (!isImagePixelInput(raw)) {
        // Non-image entries are skipped so that intake:imagePixels can
        // coexist in a pipeline with intake:hex / intake:any for mixed inputs.
        // Strict single-format validation is the caller's responsibility.
        ctx.logger.trace('IntakeImagePixels', 'run', 'Skipping non-image entry', { index: i });
        continue;
      }
      this.pushAllPixels(raw, state, ctx);
    }
  }
}

/** Singleton instance registered as the `intake:imagePixels` pipeline task. */
export const intakeImagePixels = new IntakeImagePixels();
