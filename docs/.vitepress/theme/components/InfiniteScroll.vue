<script setup lang="ts">
/**
 * InfiniteScroll.vue
 *
 * Watches the doc footer; when it becomes visible (user near bottom),
 * fetches the next sidebar item's HTML and appends it inside .vp-doc as
 * a new section. Each appended section gets a divider and a heading link
 * back to its canonical page.
 *
 * Sidebar order is read from the rendered .VPSidebarItem links so we
 * don't duplicate the route-config logic. Items already loaded are
 * tracked in a Set keyed by pathname.
 *
 * Mounted from theme/index.ts via doc-after slot — appears at the end of
 * the article on every page.
 */

import { onMounted, onUnmounted, ref } from 'vue';

const loading      = ref(false);
const exhausted    = ref(false);
const loadedPaths  = new Set<string>();
let observer:        IntersectionObserver | null = null;
let sentinel:        HTMLDivElement       | null = null;
let lastUrlPath:     string               | null = null;

function sidebarOrder(): string[] {
  if (typeof document === 'undefined') return [];
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('.VPSidebar a[href]'));
  const out: string[] = [];
  for (const a of anchors) {
    try {
      const u = new URL(a.href, window.location.origin);
      if (u.origin !== window.location.origin) continue;
      let path = u.pathname;
      if (path.endsWith('/')) path += 'index.html';
      else if (!/\.html?$/.test(path)) path += '.html';
      if (!out.includes(path)) out.push(path);
    } catch { /* skip */ }
  }
  return out;
}

function currentPathHtml(): string {
  let p = window.location.pathname;
  if (p.endsWith('/')) p += 'index.html';
  else if (!/\.html?$/.test(p)) p += '.html';
  return p;
}

function nextPath(): string | null {
  const order = sidebarOrder();
  // Find the last path we appended (or current if none yet) and pick the next one.
  const ref = lastUrlPath ?? currentPathHtml();
  const i = order.indexOf(ref);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1];
}

async function loadNext(): Promise<void> {
  if (loading.value || exhausted.value) return;
  const target = nextPath();
  if (target === null) { exhausted.value = true; return; }
  if (loadedPaths.has(target)) return;
  loadedPaths.add(target);

  loading.value = true;
  try {
    const res = await fetch(target);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const docContent = doc.querySelector('.vp-doc > div') ?? doc.querySelector('.vp-doc');
    if (!docContent) return;

    const here = document.querySelector('.vp-doc');
    if (!here) return;

    const wrap = document.createElement('section');
    wrap.className = 'iridis-infinite-section';
    const divider = document.createElement('div');
    divider.className = 'iridis-infinite-divider';
    const link = document.createElement('a');
    link.href = target.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    link.className = 'iridis-infinite-divider__link';
    link.textContent = `↓ next: ${doc.title.replace(/\s*\|\s*iridis$/, '')}`;
    divider.appendChild(link);
    wrap.appendChild(divider);

    const cloned = docContent.cloneNode(true) as HTMLElement;
    wrap.appendChild(cloned);
    here.appendChild(wrap);

    lastUrlPath = target;
  } catch {
    /* network failure — silent; user can scroll back, navigate, or refresh */
    loadedPaths.delete(target);
  } finally {
    loading.value = false;
  }
}

function bindSentinel(): void {
  if (typeof window === 'undefined' || sentinel === null) return;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) loadNext();
      }
    },
    { 'rootMargin': '400px 0px' },
  );
  observer.observe(sentinel);
}

onMounted(() => {
  lastUrlPath = currentPathHtml();
  loadedPaths.clear();
  loadedPaths.add(currentPathHtml());
  exhausted.value = false;
  // Defer one tick so the sentinel is in the DOM.
  setTimeout(bindSentinel, 50);
});
onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <ClientOnly>
    <div ref="sentinel" class="iridis-infinite-sentinel" aria-hidden="true">
      <span v-if="loading" class="iridis-infinite-status">Loading next…</span>
      <span v-else-if="exhausted" class="iridis-infinite-status">End of docs.</span>
    </div>
  </ClientOnly>
</template>

<style>
.iridis-infinite-sentinel {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}
.iridis-infinite-status {
  font-style: italic;
}
.iridis-infinite-section {
  margin-top: 3rem;
}
.iridis-infinite-divider {
  position: relative;
  margin: 2rem 0 2rem;
  padding: 0.85rem 0;
  text-align: center;
  border-top: 1px dashed var(--vp-c-divider);
  border-bottom: 1px dashed var(--vp-c-divider);
}
.iridis-infinite-divider__link {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.iridis-infinite-divider__link:hover {
  text-decoration: underline;
}
</style>
