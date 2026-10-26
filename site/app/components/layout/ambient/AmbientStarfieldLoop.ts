import type { LivingBackgroundEnvironmentInterface } from '../../../composables/interfaces/LivingBackgroundEnvironmentInterface.ts';

/** Paints the starfield at a fixed cadence while the page is visible and motion is allowed; environment changes apply live. */
export class AmbientStarfieldLoop {
  readonly #environment: LivingBackgroundEnvironmentInterface;

  readonly #frameMs: number;

  readonly #paint: (timeMs: number) => void;

  #handle: null | number = null;

  #lastPaintMs = Number.NEGATIVE_INFINITY;

  #lastTickMs = 0;

  #unsubscribe: (() => void) | null = null;

  private constructor(environment: LivingBackgroundEnvironmentInterface, paint: (timeMs: number) => void, frameMs: number) {
    this.#environment = environment;
    this.#paint = paint;
    this.#frameMs = frameMs;
  }

  public static create(
    environment: LivingBackgroundEnvironmentInterface,
    paint: (timeMs: number) => void,
    frameMs: number
  ): AmbientStarfieldLoop {
    const result = new AmbientStarfieldLoop(environment, paint, frameMs);

    return result;
  }

  public start(): void {
    this.stop();
    this.#unsubscribe = this.#environment.subscribe(() => {
      this.#sync();
    });
    this.#sync();
  }

  public stop(): void {
    this.#cancel();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  #animates(): boolean {
    const result = this.#environment.isVisible() && !this.#environment.prefersReducedMotion();

    return result;
  }

  #cancel(): void {
    if (this.#handle !== null) {
      this.#environment.scheduler.cancel(this.#handle);
      this.#handle = null;
    }
  }

  #request(): void {
    this.#handle = this.#environment.scheduler.request((timeMs) => {
      this.#tick(timeMs);
    });
  }

  /** A change of visibility or motion preference repaints once, then runs or stops the loop. */
  #sync(): void {
    this.#cancel();
    this.#lastPaintMs = this.#lastTickMs;
    this.#paint(this.#lastTickMs);
    if (this.#animates()) {
      this.#request();
    }
  }

  #tick(timeMs: number): void {
    this.#lastTickMs = timeMs;
    this.#request();
    if (timeMs - this.#lastPaintMs >= this.#frameMs) {
      this.#lastPaintMs = timeMs;
      this.#paint(timeMs);
    }
  }
}
