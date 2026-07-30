/** Wraps a hue in degrees into [0, 360). */
class NormalizeHueOperation {
  static run(hueDeg: number): number {
    return ((hueDeg % 360) + 360) % 360;
  }
}

export const normalizeHue = NormalizeHueOperation.run;
