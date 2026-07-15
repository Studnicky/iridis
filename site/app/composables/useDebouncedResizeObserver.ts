/**
 * Debounces a `ResizeObserver`'s entries by `delayMs` before invoking
 * `callback`, coalescing bursts of resize notifications into one call.
 *
 * Entries are accumulated (keyed by `entry.target`) across every RO callback
 * that lands inside the debounce window, not just the last one — a settled
 * entry from an earlier frame is merged in rather than replaced by whichever
 * element's callback happens to fire next, so no observed element's resize is
 * ever dropped. The accumulator is flushed as a single array to `callback`
 * once the timer fires, then cleared.
 */
export function useDebouncedResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void,
  delayMs = 100
): { 'disconnect': () => void; 'observe': (el: Element) => void; } {
  let observer: ResizeObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pending = new Map<Element, ResizeObserverEntry>();

  function flush(): void {
    timer = null;
    const entries = Array.from(pending.values());
    pending.clear();
    callback(entries);
  }

  function observe(el: Element): void {
    if (typeof ResizeObserver === 'undefined') {return;}
    observer ??= new ResizeObserver((entries) => {
      for (const entry of entries) {pending.set(entry.target, entry);}
      if (timer !== null) {clearTimeout(timer);}
      timer = setTimeout(flush, delayMs);
    });
    observer.observe(el);
  }

  function disconnect(): void {
    observer?.disconnect();
    observer = null;
    if (timer !== null) {clearTimeout(timer);}
    timer = null;
    pending.clear();
  }

  return { 'disconnect': disconnect, 'observe': observe };
}
