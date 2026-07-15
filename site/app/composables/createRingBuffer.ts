import { RingBuffer } from './RingBuffer.ts';

export function createRingBuffer<T>(capacity: number): RingBuffer<T> {
  return new RingBuffer<T>(capacity);
}
