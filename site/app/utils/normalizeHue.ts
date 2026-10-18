/** Wraps a hue in degrees into [0, 360). */
class NormalizeHueOperation {
  static run(hueDeg: number): number {
    const normalizedHue = ((hueDeg % 360) + 360) % 360;
    return normalizedHue;
  }
}

export const normalizeHue = NormalizeHueOperation.run;
