/** Builds collision-free keys from ordered string segments. */
export class CompositeKey {
  static of(...segments: readonly string[]): string {
    let result = '';
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment !== undefined) {
        result += `${segment.length}:${segment}`;
      }
    }
    return result;
  }
}
