/** Clamping helper for progress values confined to the [0, 1] unit interval. */
export class UnitInterval {
  static clamp(value: number): number {
    const result = Math.min(1, Math.max(0, value));
    return result;
  }
}
