/**
 * Same debounce as `debounce.ts`, keyed — a separate pending timer per key, so
 * scheduling for key A never cancels a pending call for key B. Used where
 * multiple independent entities (e.g. one per uploaded image) each need their
 * own debounce window, per useIridis.ts's `scheduleEntryReextract`.
 */
class KeyedDebounceController<K> {
  readonly #callback: (key: K) => void;
  readonly #delayMs: number;
  readonly #timers: Map<K, ReturnType<typeof setTimeout>>;

  constructor(callback: (key: K) => void, delayMs: number) {
    this.#callback = callback;
    this.#delayMs = delayMs;
    this.#timers = new Map<K, ReturnType<typeof setTimeout>>();
  }

  cancel(key: K): void {
    const existing = this.#timers.get(key);
    if (existing !== undefined) {clearTimeout(existing); this.#timers.delete(key);}
  }

  schedule(key: K): void {
    if (typeof window === 'undefined') {return;}
    const existing = this.#timers.get(key);
    if (existing !== undefined) {clearTimeout(existing);}
    this.#timers.set(key, setTimeout(() => {
      this.#timers.delete(key);
      this.#callback(key);
    }, this.#delayMs));
  }
}

class KeyedDebounceOperation {
  static run<K>(callback: (key: K) => void, delayMs: number): { 'cancel': (key: K) => void; 'schedule': (key: K) => void } {
    return new KeyedDebounceController(callback, delayMs);
  }
}

export const keyedDebounce = KeyedDebounceOperation.run;
