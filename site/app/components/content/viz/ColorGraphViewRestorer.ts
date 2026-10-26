import type { ColorGraphFrameSchedulerInterface } from './ColorGraphFrameSchedulerInterface.ts';
import type { ColorGraphViewTargetInterface } from './ColorGraphViewTargetInterface.ts';

/** Applies a saved zoom and reports completion only once the camera reads it back on a later frame. */
export class ColorGraphViewRestorer {
  public static readonly maximumAttempts = 20;

  public static readonly relativeTolerance = 1e-3;

  readonly #frames: ColorGraphFrameSchedulerInterface;

  readonly #target: ColorGraphViewTargetInterface;

  #attempts = 0;

  #frame: null | number = null;

  private constructor(target: ColorGraphViewTargetInterface, frames: ColorGraphFrameSchedulerInterface) {
    this.#target = target;
    this.#frames = frames;
  }

  public static create(
    target: ColorGraphViewTargetInterface,
    frames: ColorGraphFrameSchedulerInterface
  ): ColorGraphViewRestorer {
    const result = new ColorGraphViewRestorer(target, frames);

    return result;
  }

  public cancel(): void {
    if (this.#frame !== null) {
      this.#frames.cancel(this.#frame);
      this.#frame = null;
    }
  }

  /** Applies `zoom` now and re-verifies it on the next frame; `onRestored` runs with the zoom the camera holds. */
  public start(zoom: number, onRestored: (zoom: number) => void): void {
    this.cancel();
    this.#attempts = 0;
    this.#apply(zoom, onRestored);
  }

  #apply(zoom: number, onRestored: (zoom: number) => void): void {
    this.#attempts += 1;
    this.#target.applyZoom(zoom);
    this.#frame = this.#frames.request(() => {
      this.#frame = null;
      this.#verify(zoom, onRestored);
    });
  }

  #verify(zoom: number, onRestored: (zoom: number) => void): void {
    const held = this.#target.readZoom();
    const matches = Math.abs(held - zoom) <= zoom * ColorGraphViewRestorer.relativeTolerance;

    if (matches || this.#attempts >= ColorGraphViewRestorer.maximumAttempts) {
      onRestored(held);
    } else {
      this.#apply(zoom, onRestored);
    }
  }
}
