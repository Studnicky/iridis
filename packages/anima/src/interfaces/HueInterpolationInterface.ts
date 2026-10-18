/** Resolves one interpolated hue from two hue coordinates and normalized progress. */
export interface HueInterpolationInterface {
  apply(from: number, to: number, progress: number): number;
}
