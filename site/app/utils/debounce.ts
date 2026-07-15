/**
 * SSR-guarded "cancel the pending call, schedule a new one" debounce — the
 * single-timer shape repeated across useIridis.ts (scheduleCombine, the
 * bottom-of-file `schedule`) and useMultiOutput.ts's own `schedule` before
 * this was extracted. Returns a trigger function; call it as often as you
 * like, only the last call within `delayMs` actually runs `fn`.
 */
export function debounce(fn: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (typeof window === 'undefined') { return; }
    if (timer !== undefined) { clearTimeout(timer); }
    timer = setTimeout(() => { fn(); }, delayMs);
  };
}
