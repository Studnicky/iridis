/**
 * Same debounce as `debounce.ts`, keyed — a separate pending timer per key, so
 * scheduling for key A never cancels a pending call for key B. Used where
 * multiple independent entities (e.g. one per uploaded image) each need their
 * own debounce window, per useIridis.ts's `scheduleEntryReextract`.
 */
export function keyedDebounce<K>(fn: (key: K) => void, delayMs: number): { 'cancel': (key: K) => void; 'schedule': (key: K) => void } {
  const timers = new Map<K, ReturnType<typeof setTimeout>>();
  return {
    'cancel': (key: K) => {
      const existing = timers.get(key);
      if (existing !== undefined) { clearTimeout(existing); timers.delete(key); }
    },
    'schedule': (key: K) => {
      if (typeof window === 'undefined') { return; }
      const existing = timers.get(key);
      if (existing !== undefined) { clearTimeout(existing); }
      timers.set(key, setTimeout(() => { timers.delete(key); fn(key); }, delayMs));
    }
  };
}
