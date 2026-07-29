import type { JsonValueType } from '@studnicky/types';

import type { RawImagePixelInputInterface } from '../../interfaces/RawImagePixelInputInterface.ts';

/**
 * Type guard for `ImageData`-shaped inputs (`{data: Uint8ClampedArray,
 * width, height}`, the canvas API's pixel buffer). Shared between
 * `IntakeImagePixels`, `IntakeAny`, and `IntakeHex` so every intake path
 * agrees on the exact same detection rule.
 */
export class IsImagePixelInput {
  static check(value: JsonValueType | RawImagePixelInputInterface): value is RawImagePixelInputInterface {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {return false;}
    if (!('data' in value) || !('width' in value) || !('height' in value)) {return false;}
    return value.data instanceof Uint8ClampedArray
      && typeof value.width === 'number'
      && typeof value.height === 'number';
  }
}
