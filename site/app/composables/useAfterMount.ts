import { onMounted, ref, type Ref } from 'vue';

/**
 * False during SSR/prerender and through the initial client hydration pass,
 * flipping true only in `onMounted` — i.e. strictly after hydration
 * completes. Theme-dependent markup gated behind this renders NOTHING on
 * both the server and the client's first pass (since this site is fully
 * static-prerendered, the prerendered HTML always bakes in the default
 * theme, and the real persisted theme is only known client-side), so there
 * is never a server/client mismatch for Vue's hydration to silently mishandle
 * — the real content mounts a moment later via an ordinary reactive patch.
 */
export function useAfterMount(): Ref<boolean> {
  const afterMount = ref(false);
  onMounted(() => { afterMount.value = true; });
  return afterMount;
}
