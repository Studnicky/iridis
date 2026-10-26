import type { LivingBackgroundEnvironmentInterface } from '../../app/composables/interfaces/LivingBackgroundEnvironmentInterface.ts';

import { VirtualFrameScheduler } from './VirtualFrameScheduler.ts';

/** Scriptable visibility and motion preference over a virtual frame clock. */
export class VirtualLivingBackgroundEnvironment implements LivingBackgroundEnvironmentInterface {
  public readonly scheduler = new VirtualFrameScheduler();
  private readonly listeners = new Set<() => void>();
  private reducedMotion = false;
  private visible = true;

  public isVisible(): boolean {
    return this.visible;
  }

  public prefersReducedMotion(): boolean {
    return this.reducedMotion;
  }

  public allowMotion(): void {
    this.reducedMotion = false;
    this.notify();
  }

  public hide(): void {
    this.visible = false;
    this.notify();
  }

  public reduceMotion(): void {
    this.reducedMotion = true;
    this.notify();
  }

  public show(): void {
    this.visible = true;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    const unsubscribe = (): void => { this.listeners.delete(listener); };
    return unsubscribe;
  }

  private notify(): void {
    this.listeners.forEach((listener) => { listener(); });
  }
}
