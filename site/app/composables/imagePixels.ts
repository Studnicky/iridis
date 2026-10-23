/** Raw RGBA pixels of one decoded image; the buffer is transferred, not copied, when posted to the engine worker. */
export class ImagePixels {
  public readonly buffer: ArrayBuffer;
  public readonly height: number;
  public readonly width: number;

  public constructor(buffer: ArrayBuffer, height: number, width: number) {
    this.buffer = buffer;
    this.height = height;
    this.width = width;
  }

  /** The engine's image color input over the owned buffer. */
  public input(): { 'data': Uint8ClampedArray; 'height': number; 'width': number } {
    const result = { 'data': new Uint8ClampedArray(this.buffer), 'height': this.height, 'width': this.width };
    return result;
  }
}
