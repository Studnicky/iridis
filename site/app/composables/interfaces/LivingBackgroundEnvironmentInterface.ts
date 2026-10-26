import type { FrameSchedulerInterface } from './FrameSchedulerInterface.ts';

/** Host signals the drift loop depends on: a frame scheduler plus tab visibility and motion preference. */
export interface LivingBackgroundEnvironmentInterface {
  isVisible(): boolean;
  prefersReducedMotion(): boolean;
  readonly 'scheduler': FrameSchedulerInterface;
  /** Registers a listener for visibility or motion-preference changes and returns its unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
