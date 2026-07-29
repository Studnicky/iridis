/**
 * `ImageData`-shaped raw intake input (`{data: Uint8ClampedArray, width,
 * height}`, the canvas API's pixel buffer) — one of the accepted shapes of
 * `InputInterface.colors` before `intake:*` tasks normalize it into a
 * `ColorRecordInterfaceType`. A genuine contract (not a schema-derived data
 * type): `Uint8ClampedArray` is a binary buffer, not JSON-serializable.
 */
export interface RawImagePixelInputInterface {
  'data':   Uint8ClampedArray;
  'height': number;
  'width':  number;
}
