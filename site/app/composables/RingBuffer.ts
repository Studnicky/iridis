/** Fixed-capacity ring buffer with O(1) writes. See createRingBuffer.ts for the factory used across call sites. */
export class RingBuffer<T> {
  private readonly items: (T | undefined)[];
  private readonly snapshotCache: T[] = [];
  private head = 0;
  private length = 0;
  private snapshotDirty = true;

  public constructor(private readonly capacity: number) {
    this.items = new Array<T | undefined>(capacity);
  }

  public push(item: T): void {
    if (this.capacity <= 0) { return; }
    this.items[this.head] = item;
    this.head += 1;
    if (this.head >= this.capacity) { this.head = 0; }
    if (this.length < this.capacity) { this.length += 1; }
    this.snapshotDirty = true;
  }

  private rebuildSnapshot(): void {
    this.snapshotCache.length = 0;
    if (this.length === 0) { return; }
    if (this.length < this.capacity) {
      for (let index = 0; index < this.length; index += 1) {
        const value = this.items[index];
        if (value !== undefined) { this.snapshotCache.push(value); }
      }
      return;
    }

    for (let offset = 0; offset < this.capacity; offset += 1) {
      const index = (this.head + offset) % this.capacity;
      const value = this.items[index];
      if (value !== undefined) { this.snapshotCache.push(value); }
    }
  }

  /** Oldest-to-newest. */
  public toArray(): T[] {
    if (this.length === 0) { return []; }
    if (this.snapshotDirty) {
      this.rebuildSnapshot();
      this.snapshotDirty = false;
    }
    return this.snapshotCache.slice();
  }

  public snapshot(): readonly T[] {
    if (this.length === 0) {
      this.snapshotCache.length = 0;
      return this.snapshotCache;
    }
    if (this.snapshotDirty) {
      this.rebuildSnapshot();
      this.snapshotDirty = false;
    }
    return this.snapshotCache;
  }
}
