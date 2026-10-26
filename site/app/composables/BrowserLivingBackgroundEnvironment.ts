import type { FrameSchedulerInterface } from './interfaces/FrameSchedulerInterface.ts';
import type { LivingBackgroundEnvironmentInterface } from './interfaces/LivingBackgroundEnvironmentInterface.ts';

import { AnimationFrameScheduler } from './AnimationFrameScheduler.ts';

/** Window-backed environment: requestAnimationFrame scheduling, document visibility, and the reduced-motion media query. */
export class BrowserLivingBackgroundEnvironment implements LivingBackgroundEnvironmentInterface {
  public readonly scheduler: FrameSchedulerInterface;
  private readonly document: Document;
  private readonly reducedMotionQuery: MediaQueryList;

  public constructor(host: Window) {
    this.document = host.document;
    this.reducedMotionQuery = host.matchMedia('(prefers-reduced-motion: reduce)');
    this.scheduler = new AnimationFrameScheduler(host);
  }

  public isVisible(): boolean {
    const visible = this.document.visibilityState === 'visible';
    return visible;
  }

  public prefersReducedMotion(): boolean {
    return this.reducedMotionQuery.matches;
  }

  public subscribe(listener: () => void): () => void {
    this.document.addEventListener('visibilitychange', listener);
    this.reducedMotionQuery.addEventListener('change', listener);
    const unsubscribe = (): void => {
      this.document.removeEventListener('visibilitychange', listener);
      this.reducedMotionQuery.removeEventListener('change', listener);
    };
    return unsubscribe;
  }
}
