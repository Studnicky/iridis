import type { Quad } from 'n3';

/** Structural contract for an n3 Store or any iterable quad container. */
export interface IterableStoreInterface {
  [Symbol.iterator](): Iterator<Quad>;
}
