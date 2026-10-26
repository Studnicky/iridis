import { EffectInterpreter } from '@studnicky/fsm/browser';

import type { ColorGraphLifecycleState } from './ColorGraphLifecycleState.ts';
import type { ColorGraphMountHostInterface } from './ColorGraphMountHostInterface.ts';

import { ColorGraphLifecycleEvent } from './ColorGraphLifecycleEvent.ts';
import { ColorGraphLifecycleMachine } from './ColorGraphLifecycleMachine.ts';

/** Mounts one live graph while its carousel face is active and keeps a snapshot of the last frame while it is not. */
export class ColorGraphMountController<Handle extends object, Snapshot extends object> {
  readonly #host: ColorGraphMountHostInterface<Handle, Snapshot>;
  readonly #interpreter: EffectInterpreter<ColorGraphLifecycleState, ColorGraphLifecycleEvent>;
  readonly #timers = new Map<string, Set<ReturnType<typeof setTimeout>>>();
  #handle: Handle | null = null;
  #hasSnapshot = false;

  private constructor(host: ColorGraphMountHostInterface<Handle, Snapshot>) {
    this.#host = host;
    this.#interpreter = EffectInterpreter.create(ColorGraphLifecycleMachine.create());
    this.#interpreter.start();
  }

  static create<Handle extends object, Snapshot extends object>(
    host: ColorGraphMountHostInterface<Handle, Snapshot>
  ): ColorGraphMountController<Handle, Snapshot> {
    const result = new ColorGraphMountController<Handle, Snapshot>(host);

    return result;
  }

  get handle(): Handle | null {
    return this.#handle;
  }

  cancel(group: string): void {
    const pending = this.#timers.get(group);

    if (pending !== undefined) {
      for (const timer of pending) {
        clearTimeout(timer);
      }
      this.#timers.delete(group);
    }
  }

  dispose(): void {
    this.#cancelAll();
    this.#disposeHandle();
    this.#clearSnapshot();
    this.signal(ColorGraphLifecycleEvent.destroyed());
  }

  getState(): ColorGraphLifecycleState {
    const result = this.#interpreter.getState();

    return result;
  }

  mount(): Handle {
    const existing = this.#handle;

    if (existing !== null) {
      return existing;
    }
    this.signal(ColorGraphLifecycleEvent.constructed());
    try {
      const handle = this.#host.construct();

      this.#handle = handle;

      return handle;
    } catch (error) {
      this.signal(ColorGraphLifecycleEvent.destroyed());
      throw error;
    }
  }

  pendingTimerCount(): number {
    let result = 0;

    for (const pending of this.#timers.values()) {
      result += pending.size;
    }

    return result;
  }

  releaseSnapshot(): void {
    this.#clearSnapshot();
  }

  schedule(group: string, delayMs: number, run: () => void): void {
    const pending = this.#timers.get(group) ?? new Set<ReturnType<typeof setTimeout>>();
    const timer = setTimeout(() => {
      pending.delete(timer);
      run();
    }, delayMs);

    pending.add(timer);
    this.#timers.set(group, pending);
  }

  signal(event: ColorGraphLifecycleEvent): void {
    this.#interpreter.send(event).catch((error: unknown) => {
      this.#host.reportRejection(error);
    });
  }

  subscribe(listener: (state: ColorGraphLifecycleState) => void): void {
    this.#interpreter.subscribe(listener);
  }

  suspend(): void {
    const handle = this.#handle;

    this.#cancelAll();
    if (handle !== null) {
      const snapshot = this.getState().isDeviceReady() ? this.#host.capture(handle) : null;

      this.#disposeHandle();
      this.#host.presentSnapshot(snapshot);
      this.#hasSnapshot = snapshot !== null;
      this.signal(snapshot === null ? ColorGraphLifecycleEvent.destroyed() : ColorGraphLifecycleEvent.suspended());
    }
  }

  #cancelAll(): void {
    this.#timers.forEach((pending) => {
      pending.forEach((timer) => {
        clearTimeout(timer);
      });
    });
    this.#timers.clear();
  }

  #clearSnapshot(): void {
    if (this.#hasSnapshot) {
      this.#hasSnapshot = false;
      this.#host.presentSnapshot(null);
    }
  }

  #disposeHandle(): void {
    const handle = this.#handle;

    this.#handle = null;
    if (handle !== null) {
      this.#host.dispose(handle);
    }
  }
}
