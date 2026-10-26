import type { PaletteEntity } from '@studnicky/iridis-algebra';

import type { FrameRecorderInterface } from '../../app/composables/interfaces/FrameRecorderInterface.ts';

export class CountingFrameRecorder implements FrameRecorderInterface {
  public readonly frames: PaletteEntity.Type[] = [];

  public record(frame: PaletteEntity.Type): void {
    this.frames.push(frame);
  }
}
