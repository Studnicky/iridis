import type { FrameSchedulerInterface } from './interfaces/FrameSchedulerInterface.ts';

/** Schedules callbacks on a window's requestAnimationFrame. */
export class AnimationFrameScheduler implements FrameSchedulerInterface {
  private readonly host: Window;

  public constructor(host: Window) {
    this.host = host;
  }

  public cancel(handle: number): void {
    this.host.cancelAnimationFrame(handle);
  }

  public request(callback: (timeMs: number) => void): number {
    const handle = this.host.requestAnimationFrame(callback);
    return handle;
  }
}
