<script setup lang="ts">
/**
 * SidebarToc.vue
 *
 * "On this page" outline rendered as a collapsible accordion in the left
 * sidebar. Walks the live DOM (.vp-doc h2/h3) instead of vitepress's
 * useData().page.headers — the latter returns empty in some layouts.
 */

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vitepress';

interface HeadingItem {
  'level': number;
  'text':  string;
  'id':    string;
}

const router = useRouter();
const open       = ref(true);
const activeId   = ref<string | null>(null);
const headings   = ref<HeadingItem[]>([]);
const refreshTick = ref(0);

let observer: IntersectionObserver | null = null;
let mutationObserver: MutationObserver | null = null;

function readHeadings(): void {
  if (typeof document === 'undefined') return;
  const els = document.querySelectorAll('.vp-doc h2[id], .vp-doc h3[id]');
  const next: HeadingItem[] = [];
  for (const el of Array.from(els)) {
    const text = (el.textContent ?? '').replace(/​/g, '').replace(/^#\s*/, '').trim();
    if (text === '') continue;
    next.push({
      'level': el.tagName === 'H2' ? 2 : 3,
      'text':  text,
      'id':    el.id,
    });
  }
  headings.value = next;
}

function rebindObserver(): void {
  if (typeof window === 'undefined') return;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
      if (visible[0]) {
        activeId.value = (visible[0].target as HTMLElement).id;
      }
    },
    { 'rootMargin': '-15% 0% -70% 0%' },
  );
  for (const h of headings.value) {
    const el = document.getElementById(h.id);
    if (el) observer.observe(el);
  }
}

function refresh(): void {
  readHeadings();
  rebindObserver();
  refreshTick.value++;
}

onMounted(() => {
  refresh();
  // Re-read when the inner content node mutates (vitepress hot-swaps it
  // on client-side navigation).
  if (typeof document !== 'undefined') {
    const root = document.querySelector('.VPDoc') ?? document.body;
    mutationObserver = new MutationObserver(() => {
      // debounce by next-frame so multiple mutations coalesce
      requestAnimationFrame(refresh);
    });
    mutationObserver.observe(root, { 'childList': true, 'subtree': true });
  }
  // After client-side route change, re-read (mutation observer already
  // covers most cases but this catches edge cases).
  router.onAfterRouteChange = () => {
    setTimeout(refresh, 50);
  };
});
onUnmounted(() => {
  observer?.disconnect();
  mutationObserver?.disconnect();
  observer = null;
  mutationObserver = null;
});

const visible = computed(() => headings.value.length > 0);
</script>

<template>
  <ClientOnly>
    <section v-if="visible" :class="['iridis-toc', { 'iridis-toc--open': open }]">
      <button
        type="button"
        class="iridis-toc__head"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span class="iridis-toc__chevron" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
        <span class="iridis-toc__label">On this page</span>
      </button>
      <ul v-show="open" class="iridis-toc__list">
        <li
          v-for="h in headings"
          :key="h.id"
          :class="['iridis-toc__item', `iridis-toc__item--l${h.level}`, { 'iridis-toc__item--active': activeId === h.id }]"
        >
          <a :href="'#' + h.id">{{ h.text }}</a>
        </li>
      </ul>
    </section>
  </ClientOnly>
</template>

<style scoped>
.iridis-toc {
  margin: 0.4rem 0;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in oklch, var(--vp-c-divider) 50%, transparent);
}
.iridis-toc__head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--vp-c-text-3);
}
.iridis-toc__chevron { font-size: 0.7rem; }
.iridis-toc__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.iridis-toc__head:hover { color: var(--vp-c-brand-1); }
.iridis-toc__list {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  font-size: 0.82rem;
}
.iridis-toc__item a {
  display: block;
  padding: 0.18rem 0;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-left: 2px solid transparent;
  padding-left: 0.55rem;
  transition: border-color 120ms, color 120ms;
}
.iridis-toc__item--l3 a { padding-left: 1.4rem; font-size: 0.78rem; color: var(--vp-c-text-3); }
.iridis-toc__item a:hover { color: var(--vp-c-brand-1); }
.iridis-toc__item--active a {
  color: var(--vp-c-brand-1);
  border-left-color: var(--vp-c-brand-1);
}
</style>
