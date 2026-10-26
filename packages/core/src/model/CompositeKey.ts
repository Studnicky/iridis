/** Builds collision-free keys from ordered string segments. */
export class CompositeKey {
  static of(...segments: readonly string[]): string {
    const result = segments.join(String.fromCharCode(0));
    return result;
  }
}
