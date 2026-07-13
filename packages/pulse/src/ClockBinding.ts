import type { ClockProviderType } from './clock/ClockProviderType.ts';
import { RealClockProvider } from './clock/RealClockProvider.ts';
import { VirtualClockProvider } from './clock/VirtualClockProvider.ts';
import type { SignalBindingInterfaceType } from './types/index.ts';

export interface ClockBindingOptionsInterfaceType {
  /** 'real' drives `t` from `Date.now()`; 'virtual' requires manual `advance()`. */
  mode: 'real' | 'virtual';
  /** Duration in milliseconds mapping to `t === 1`. */
  durationMs: number;
}

/**
 * Binds a duration to a progress value `t` in [0, 1], backed by either a
 * real-time source (`Date.now()`) or a deterministic virtual stepper driven
 * by `advance(deltaMs)`. Construct via `ClockBinding.create(opts)`.
 */
export class ClockBinding implements SignalBindingInterfaceType {
  private readonly provider: ClockProviderType;

  protected constructor(provider: ClockProviderType) {
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
