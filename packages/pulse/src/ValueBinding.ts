import type { ValueBindingOptionsInterfaceType } from './types/index.ts';

/**
 * Maps a raw scalar (scroll position, gesture delta, sensor reading) into
 * the normalized `t` domain consumed by iridis-anima's `evaluate`. Construct
 * via `ValueBinding.create(opts)`.
 */
export class ValueBinding {
  private readonly min: number;
  private readonly max: number;
  private readonly clamp: boolean;

  protected constructor(min: number, max: number, clamp: boolean) {
    this.min = min;
    this.max = max;
    this.clamp = clamp;
  }

  static create(opts: ValueBindingOptionsInterfaceType): ValueBinding {
    return new ValueBinding(opts.min, opts.max, opts.clamp ?? true);
  }

  mapToT(value: number): number {
    const span = this.max - this.min;
    const raw = span === 0 ? 0 : (value - this.min) / span;
    return this.clamp ? Math.min(1, Math.max(0, raw)) : raw;
  }
}
