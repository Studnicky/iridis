import type { ClockProviderInterface } from './clock/ClockProviderInterface.ts';
import type { ClockBindingOptionsInterfaceType, SignalBindingInterfaceType } from './types/index.ts';

import { RealClockProvider } from './clock/RealClockProvider.ts';
import { VirtualClockProvider } from './clock/VirtualClockProvider.ts';

/**
 * Binds a duration to a progress value `t` in [0, 1], backed by either a
 * real-time source (`Date.now()`) or a deterministic virtual stepper driven
 * by `advance(deltaMs)`. Construct via `ClockBinding.create(opts)`.
 */
export class ClockBinding implements SignalBindingInterfaceType {
  private readonly provider: ClockProviderInterface;

  protected constructor(provider: ClockProviderInterface) {
    this.provider = provider;
  }

  static create(opts: ClockBindingOptionsInterfaceType): ClockBinding {
    const provider = opts.mode === 'real'
      ? RealClockProvider.create(opts.durationMs)
      : VirtualClockProvider.create(opts.durationMs);
    return new ClockBinding(provider);
  }

  get t(): number {
    return this.provider.t;
  }

  /** Manually moves elapsed time forward by `deltaMs`. Only meaningful in 'virtual' mode. */
  advance(deltaMs: number): void {
    this.provider.advance(deltaMs);
  }
}
