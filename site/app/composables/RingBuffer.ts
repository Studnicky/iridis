/** Plain array-based ring buffer — simple shift+push, fine at this scale (capacity ~240, not a hot path). See createRingBuffer.ts for the factory used across call sites. */
export class RingBuffer<T> {
  private readonly items: T[] = [];

  public constructor(private readonly capacity: number) {}

  public push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.capacity) { this.items.shift(); }
  }

  /** Oldest-to-newest. */
  public toArray(): T[] {
    return [...this.items];
  }
}
