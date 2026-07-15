/** Wraps a hue in degrees into [0, 360). */
export function normalizeHue(hueDeg: number): number {
  return ((hueDeg % 360) + 360) % 360;
}
