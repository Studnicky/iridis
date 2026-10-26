import { PaletteEntity } from '@studnicky/iridis-algebra';
import { evaluate } from '@studnicky/iridis-anima';

import type { LivingBackgroundDriverOptionsInterface } from './interfaces/LivingBackgroundDriverOptionsInterface.ts';
import type { LivingBackgroundFrameInterface } from './interfaces/LivingBackgroundFrameInterface.ts';

import { buildDecorativePalette } from './buildDecorativePalette.ts';
import { LIVING_BACKGROUND } from './constants/LivingBackgroundConstants.ts';
import { driftTarget } from './driftTarget.ts';
import { tokensForFrame } from './tokensForFrame.ts';

/**
 * Fixed-step ambient colour drift. Each display frame advances the simulation in
 * `STEP_MS` increments, records one sample per step, and emits one interpolated
 * frame. Frames are delivered to `onFrame`; the driver never touches the DOM.
 */
export class LivingBackgroundDriver {
  private accumulatorMs = 0;
  private animationMs = 0;
  private cycleMs = 0;
  private from: PaletteEntity.Type = {};
  private ready = false;
  private handle: null | number = null;
  private lastFrame: LivingBackgroundFrameInterface | null = null;
  private lastTimeMs: null | number = null;
  private target: PaletteEntity.Type = {};
  private unsubscribe: (() => void) | null = null;

  private readonly options: LivingBackgroundDriverOptionsInterface;

  public constructor(options: LivingBackgroundDriverOptionsInterface) {
    this.options = options;
  }

  public start(): void {
    this.stop();
    this.unsubscribe = this.options.environment.subscribe(() => { this.sync(); });
    this.sync();
  }

  public stop(): void {
    this.cancel();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Re-seeds the drift from the committed palette and repaints when the loop is not running. */
  public paletteCommitted(): void {
    this.reseed();
    if (this.handle === null && this.options.environment.isVisible()) {
      this.emit(this.cycleMs, this.animationMs);
    }
  }

  /** Re-emits the latest frame, or renders a first frame when none exists yet. */
  public repaint(): void {
    if (this.lastFrame === null) {
      this.emit(this.cycleMs, this.animationMs);
    } else {
      this.options.onFrame(this.lastFrame);
    }
  }

  private advance(deltaMs: number): void {
    const stepBudgetMs = LIVING_BACKGROUND.STEP_MS * LIVING_BACKGROUND.STEP_LIMIT_PER_FRAME;
    this.accumulatorMs += Math.min(deltaMs, stepBudgetMs);
    while (this.accumulatorMs >= LIVING_BACKGROUND.STEP_MS && this.ensurePalette()) {
      this.accumulatorMs -= LIVING_BACKGROUND.STEP_MS;
      this.cycleMs += LIVING_BACKGROUND.STEP_MS;
      this.animationMs += LIVING_BACKGROUND.STEP_MS;
      this.options.recorder?.record(this.frameAt(this.cycleMs));
      if (this.cycleMs >= LIVING_BACKGROUND.CYCLE_MS) {
        this.reseed();
      }
    }
    this.emit(this.cycleMs + this.accumulatorMs, this.animationMs + this.accumulatorMs);
  }

  private cancel(): void {
    if (this.handle !== null) {
      this.options.environment.scheduler.cancel(this.handle);
      this.handle = null;
    }
  }

  private emit(cycleMs: number, animationMs: number): void {
    if (this.ensurePalette()) {
      const frame = this.frameAt(cycleMs);
      const output: LivingBackgroundFrameInterface = { 'animationMs': animationMs, 'frame': frame, 'tokens': tokensForFrame(frame) };
      this.lastFrame = output;
      this.options.onFrame(output);
    }
  }

  /** The engine palette resolves asynchronously, so the drift source is read until the first populated palette is admitted. */
  private ensurePalette(): boolean {
    if (!this.ready) {
      this.reseed();
    }
    return this.ready;
  }

  private frameAt(cycleMs: number): PaletteEntity.Type {
    const result = evaluate(this.from, this.target, cycleMs / LIVING_BACKGROUND.CYCLE_MS);
    return result;
  }

  /** Admits the committed palette and a fresh drift target; the only place the palette is validated. */
  private reseed(): void {
    this.cycleMs = 0;
    this.from = PaletteEntity.intake(buildDecorativePalette(this.options.readViews()));
    this.ready = Object.keys(this.from).length > 0;
    this.target = this.ready ? PaletteEntity.intake(driftTarget(this.from, this.options.random)) : {};
  }

  private schedule(): void {
    this.handle = this.options.environment.scheduler.request((timeMs) => { this.tick(timeMs); });
  }

  private sync(): void {
    const environment = this.options.environment;
    const visible = environment.isVisible();
    const animating = visible && !environment.prefersReducedMotion();
    if (animating) {
      if (this.handle === null) {
        this.lastTimeMs = null;
        this.accumulatorMs = 0;
        this.schedule();
      }
    } else {
      this.cancel();
      if (visible) {
        this.emit(this.cycleMs, this.animationMs);
      }
    }
  }

  private tick(timeMs: number): void {
    const previousMs = this.lastTimeMs ?? timeMs;
    this.lastTimeMs = timeMs;
    this.advance(timeMs - previousMs);
    this.schedule();
  }
}
