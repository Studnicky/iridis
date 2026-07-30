import type { ValueBindingOptionsInterfaceType } from './types/index.ts';

/**
 * Maps a raw scalar (scroll position, gesture delta, sensor reading) into
 * the normalized `t` domain consumed by iridis-anima's `evaluate`. Construct
 * via `ValueBinding.create(options)`.
 */
export class ValueBinding {
  private readonly minimum: number;
  private readonly maximum: number;
  private readonly clamp: boolean;

  protected constructor(minimum: number, maximum: number, clamp: boolean) {
    this.minimum = minimum;
    this.maximum = maximum;
    this.clamp = clamp;
  }

  static create(options: ValueBindingOptionsInterfaceType): ValueBinding {
    return new ValueBinding(options.min, options.max, options.clamp ?? true);
  }

  mapToT(value: number): number {
    const span = this.maximum - this.minimum;
    const raw = span === 0 ? 0 : (value - this.minimum) / span;
    return this.clamp ? Math.min(1, Math.max(0, raw)) : raw;
  }
}
