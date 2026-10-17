import type { ValueBindingOptionsInterfaceTypeEntity } from './entities/ValueBindingOptionsInterfaceTypeEntity.ts';

import { UnitInterval } from './clock/UnitInterval.ts';

/**
 * Maps a raw scalar (scroll position, gesture delta, sensor reading) into
 * the normalized `t` domain consumed by iridis-anima's `evaluate`. Construct
 * via `ValueBinding.create(options)`.
 */
export class ValueBinding {
  private readonly minimum: number;
  private readonly maximum: number;
  private readonly mapRaw: (raw: number) => number;

  protected constructor(minimum: number, maximum: number, mapRaw: (raw: number) => number) {
    this.minimum = minimum;
    this.maximum = maximum;
    this.mapRaw = mapRaw;
  }

  static create(options: ValueBindingOptionsInterfaceTypeEntity.Type): ValueBinding {
    const mapRaw: (raw: number) => number = options.clamp === false ? Number : UnitInterval.clamp;
    const result = new ValueBinding(options.minimum, options.maximum, mapRaw);
    return result;
  }

  mapToT(value: number): number {
    const span = this.maximum - this.minimum;
    const raw = span === 0 ? 0 : (value - this.minimum) / span;
    const result = this.mapRaw(raw);
    return result;
  }
}
