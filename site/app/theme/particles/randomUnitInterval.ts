/** Cryptographically secure random fraction in [0, 1), suitable for visual particle placement. */
class RandomUnitIntervalOperation {
  static run(): number {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    const value = values[0] ?? 0;
    const result = value / 4_294_967_296;
    return result;
  }
}

export const randomUnitInterval = RandomUnitIntervalOperation.run;
