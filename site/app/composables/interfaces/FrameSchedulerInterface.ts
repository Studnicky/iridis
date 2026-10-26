/** Schedules one callback for the next display frame; the callback receives a monotonic timestamp in milliseconds. */
export interface FrameSchedulerInterface {
  cancel(handle: number): void;
  request(callback: (timeMs: number) => void): number;
}
