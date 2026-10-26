import type { FrameSchedulerInterface } from '../../app/composables/interfaces/FrameSchedulerInterface.ts';

/** Manual frame clock: `advance` runs every pending callback once per virtual display frame. */
export class VirtualFrameScheduler implements FrameSchedulerInterface {
  public static readonly frameMs = 25;
  public nowMs = 0;
  private nextHandle = 1;
  private readonly pending = new Map<number, (timeMs: number) => void>();

  public advance(totalMs: number): void {
    for (let elapsed = 0; elapsed < totalMs; elapsed += VirtualFrameScheduler.frameMs) {
      this.nowMs += VirtualFrameScheduler.frameMs;
      const callbacks = Array.from(this.pending.values());
      this.pending.clear();
      callbacks.forEach((callback) => { callback(this.nowMs); });
    }
  }

  public cancel(handle: number): void {
    this.pending.delete(handle);
  }

  public hasPending(): boolean {
    const result = this.pending.size > 0;
    return result;
  }

  public request(callback: (timeMs: number) => void): number {
    const handle = this.nextHandle;
    this.nextHandle += 1;
    this.pending.set(handle, callback);
    return handle;
  }
}
