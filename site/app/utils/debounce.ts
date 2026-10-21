/**
 * SSR-safe trailing-edge debounce. The returned trigger replaces any pending
 * timer, so only the final trigger within `delayMs` runs the callback.
 */
class DebounceOperation {
  static run(callback: () => void, delayMs: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
      if (typeof window === 'undefined') { return; }
      if (timer !== undefined) { clearTimeout(timer); }
      timer = setTimeout(() => { callback(); }, delayMs);
    };
  }
}

export const debounce = DebounceOperation.run;
