/**
 * Debounces a `ResizeObserver`'s entries by `delayMs` before invoking
 * `callback`, coalescing bursts of resize notifications into one call.
 */
export function useDebouncedResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void,
  delayMs = 100
): { observe: (el: Element) => void; disconnect: () => void } {
  let observer: ResizeObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function observe(el: Element): void {
    if (typeof ResizeObserver === 'undefined') return;
    if (!observer) {
      observer = new ResizeObserver((entries) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => callback(entries), delayMs);
      });
    }
    observer.observe(el);
  }

  function disconnect(): void {
    observer?.disconnect();
    observer = null;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  return { observe, disconnect };
}
