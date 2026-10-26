import type { LivingBackgroundFrameInterface } from '../../app/composables/interfaces/LivingBackgroundFrameInterface.ts';
import type { RoleViewType } from '../../app/composables/types/roleViewType.ts';

import { LivingBackgroundDriver } from '../../app/composables/LivingBackgroundDriver.ts';
import { CountingFrameRecorder } from './CountingFrameRecorder.ts';
import { LIVING_BACKGROUND_VIEWS } from './LivingBackgroundViews.ts';
import { VirtualLivingBackgroundEnvironment } from './VirtualLivingBackgroundEnvironment.ts';

/** A driver wired to a virtual clock, a counting recorder, and a frame sink; `views` is the engine palette the driver reads. */
export class LivingBackgroundHarness {
  public readonly driver: LivingBackgroundDriver;
  public readonly environment = new VirtualLivingBackgroundEnvironment();
  public readonly frames: LivingBackgroundFrameInterface[] = [];
  public readonly recorder = new CountingFrameRecorder();
  public views: RoleViewType[] = LIVING_BACKGROUND_VIEWS;
  private readonly collect = (frame: LivingBackgroundFrameInterface): void => { this.frames.push(frame); };
  private readonly readViews = (): RoleViewType[] => {
    const current = this.views;
    return current;
  };
  private readonly upperBound = (): number => {
    const bound = 1;
    return bound;
  };

  public constructor() {
    this.driver = new LivingBackgroundDriver({
      'environment': this.environment,
      'onFrame': this.collect,
      'random': this.upperBound,
      'readViews': this.readViews,
      'recorder': this.recorder
    });
  }
}
