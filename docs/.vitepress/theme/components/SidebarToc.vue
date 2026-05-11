<script setup lang="ts">
/**
 * SidebarToc.vue — inline TOC injector for the active sidebar item.
 *
 * Walks the live DOM (.vp-doc h2/h3) and injects an inline list of the
 * current page's headings directly under the active VPSidebarItem. The
 * TOC expands the current page entry like an accordion; other pages
 * stay collapsed (only their title shown).
 *
 * Active heading tracking via IntersectionObserver. The currently
 * in-viewport heading receives a brand-tinted highlight in the
 * injected list.
 *
 * The component itself renders no markup — it owns lifecycle hooks
 * that perform DOM injection into the VitePress sidebar tree.
 */

import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vitepress';

interface Heading {
  'level': 2 | 3;
  'text':  string;
  'id':    string;
}

const INJECT_CLASS = 'iridis-toc-inline';
const INJECT_PARENT_CLASS = 'iridis-toc-inline-host';

let intersection: IntersectionObserver | null = null;
let docMutation:  MutationObserver     | null = null;
let sideMutation: MutationObserver     | null = null;
let activeId:     string | null        = null;
let scheduled = false;

function readHeadings(): Heading[] {
  if (typeof document === 'undefined') return [];
  const els = Array.from(document.querySelectorAll('.vp-doc h2[id], .vp-doc h3[id]'));
  const out: Heading[] = [];
  for (const el of els) {
    const text = (el.textContent ?? '').replace(/​/g, '').replace(/^#\s*/, '').trim();
    if (text === '') continue;
    out.push({
      'level': el.tagName === 'H2' ? 2 : 3,
      'text':  text,
      'id':    el.id,
    });
  }
  return out;
}

function findActiveSidebarItem(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  // Prefer the deepest active item (i.e., the leaf link being viewed).
  const candidates = document.querySelectorAll<HTMLElement>('.VPSidebarItem.is-active');
  if (candidates.length === 0) return null;
  // The leaf item is the one with no further is-active descendants — pick
  // the last one in DOM order which corresponds to the deepest active.
  let leaf: HTMLElement | null = null;
  for (const el of Array.from(candidates)) {
    if (!el.querySelector('.VPSidebarItem.is-active')) {
      leaf = el;
    }
  }
  return leaf ?? candidates[candidates.length - 1] ?? null;
}

function removeInjected(): void {
  if (typeof document === 'undefined') return;
  for (const el of Array.from(document.querySelectorAll(`.${INJECT_CLASS}`))) {
    el.remove();
  }
  for (const el of Array.from(document.querySelectorAll(`.${INJECT_PARENT_CLASS}`))) {
    el.classList.remove(INJECT_PARENT_CLASS);
  }
}

function renderInline(headings: Heading[], host: HTMLElement): HTMLElement {
  const ul = document.createElement('ul');
  ul.className = INJECT_CLASS;
  ul.setAttribute('aria-label', 'On this page');
  for (const h of headings) {
    const li = document.createElement('li');
    li.className = `iridis-toc-inline__item iridis-toc-inline__item--h${h.level}`;
    if (activeId === h.id) li.classList.add('iridis-toc-inline__item--active');
    li.dataset['headingId'] = h.id;
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.className = 'iridis-toc-inline__link';
    a.textContent = h.text;
    li.appendChild(a);
    ul.appendChild(li);
  }
  host.appendChild(ul);
  host.classList.add(INJECT_PARENT_CLASS);
  return ul;
}

function rebindIntersection(headings: Heading[]): void {
  if (typeof window === 'undefined') return;
  intersection?.disconnect();
  intersection = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
      if (visible[0]) {
        const id = (visible[0].target as HTMLElement).id;
        if (id !== activeId) {
          activeId = id;
          updateActiveMarker();
        }
      }
    },
    { 'rootMargin': '-15% 0% -70% 0%' },
  );
  for (const h of headings) {
    const el = document.getElementById(h.id);
    if (el) intersection.observe(el);
  }
}

function updateActiveMarker(): void {
  if (typeof document === 'undefined') return;
  const items = document.querySelectorAll<HTMLElement>(`.${INJECT_CLASS} > li`);
  for (const li of Array.from(items)) {
    const id = li.dataset['headingId'];
    li.classList.toggle('iridis-toc-inline__item--active', id === activeId);
  }
}

function refresh(): void {
  if (typeof document === 'undefined') return;
  scheduled = false;
  const headings = readHeadings();
  removeInjected();
  if (headings.length === 0) {
    intersection?.disconnect();
    return;
  }
  const host = findActiveSidebarItem();
  if (!host) {
    intersection?.disconnect();
    return;
  }
  renderInline(headings, host);
  rebindIntersection(headings);
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(refresh);
}

const router = useRouter();

onMounted(() => {
  if (typeof document === 'undefined') return;
  schedule();
  const doc = document.querySelector('.VPDoc') ?? document.body;
  docMutation = new MutationObserver(schedule);
  docMutation.observe(doc, { 'childList': true, 'subtree': true });
  const side = document.querySelector('.VPSidebar') ?? document.body;
  sideMutation = new MutationObserver(schedule);
  sideMutation.observe(side, { 'childList': true, 'subtree': true, 'attributes': true, 'attributeFilter': ['class'] });
  router.onAfterRouteChange = () => {
    setTimeout(schedule, 60);
  };
});

onUnmounted(() => {
  intersection?.disconnect();
  docMutation?.disconnect();
  sideMutation?.disconnect();
  intersection = null;
  docMutation  = null;
  sideMutation = null;
  removeInjected();
});
</script>

<template>
  <ClientOnly>
    <div class="iridis-toc-mount" aria-hidden="true" />
  </ClientOnly>
</template>

<style scoped>
.iridis-toc-mount {
  display: none;
}
</style>
