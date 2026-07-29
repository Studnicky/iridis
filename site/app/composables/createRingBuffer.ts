import { RingBuffer } from './RingBuffer.ts';

class CreateRingBufferOperation {
  static run<T>(capacity: number): RingBuffer<T> {
    return new RingBuffer<T>(capacity);
  }
}

export const createRingBuffer = CreateRingBufferOperation.run;
