interface ImagePixelInputInterface {
  'data':   Uint8ClampedArray;
  'height': number;
  'width':  number;
}

/**
 * Type guard for `ImageData`-shaped inputs (`{data: Uint8ClampedArray,
 * width, height}`, the canvas API's pixel buffer). Shared between
 * `IntakeImagePixels`, `IntakeAny`, and `IntakeHex` so every intake path
 * agrees on the exact same detection rule.
 */
export function isImagePixelInput(v: unknown): v is ImagePixelInputInterface {
  if (typeof v !== 'object' || v === null) {return false;}
  const o = v as Record<string, unknown>;
  return o.data instanceof Uint8ClampedArray
    && typeof o.width === 'number'
    && typeof o.height === 'number';
}
