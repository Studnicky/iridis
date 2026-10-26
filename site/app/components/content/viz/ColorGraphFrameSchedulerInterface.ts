/** Runs a callback on the next display frame. */
export interface ColorGraphFrameSchedulerInterface {
  'cancel': (handle: number) => void;
  'request': (run: () => void) => number;
}
